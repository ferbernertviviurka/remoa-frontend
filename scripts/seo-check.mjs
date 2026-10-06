#!/usr/bin/env node
// F27 FR-37: `pnpm seo:check` — checks sitemap.xml, robots.txt and the SEO tags of a sample of pages on a running site.
// SEO_CHECK_URL (default http://localhost:3000). Exit code 1 on any failure. No dependencies: fetch + regex on the server HTML.
const BASE = (process.env.SEO_CHECK_URL || 'http://localhost:3000').replace(/\/+$/, '');
const PRIVATE = ['/app', '/admin', '/api', '/entrar', '/cadastro', '/recuperar-senha', '/redefinir-senha', '/auth', '/confirmar-email', '/dev'];
const ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/;

const failures = [];
const fail = (where, msg) => failures.push(`${where}: ${msg}`);
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)].map((m) => [m[1].toLowerCase(), m[2]]));
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((m) => attrs(m[0]));
const meta = (html, key, value) => tags(html, 'meta').find((a) => a[key] === value)?.content;
const isPrivate = (path) => PRIVATE.some((p) => path === p || path.startsWith(`${p}/`)) || path.includes('/preview/');

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  return { status: res.status, type: res.headers.get('content-type') ?? '', body: await res.text() };
}

async function checkSitemap() {
  const r = await get('/sitemap.xml');
  if (r.status !== 200) return fail('sitemap.xml', `status ${r.status}`), [];
  if (!/xml/.test(r.type)) fail('sitemap.xml', `content-type ${r.type}`);
  if (!/^\s*<\?xml[^>]*\?>\s*<urlset[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/.test(r.body)) fail('sitemap.xml', 'not an XML <urlset> of sitemaps.org');
  if ((r.body.match(/<url>/g) ?? []).length !== (r.body.match(/<\/url>/g) ?? []).length) fail('sitemap.xml', 'unbalanced <url>');
  if (/<(priority|changefreq)>/.test(r.body)) fail('sitemap.xml', 'has priority/changefreq');
  const urls = [...r.body.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({ loc: m[1].match(/<loc>([^<]*)<\/loc>/)?.[1] ?? '', lastmod: m[1].match(/<lastmod>([^<]*)<\/lastmod>/)?.[1] }));
  if (!urls.length) fail('sitemap.xml', 'no URL');
  for (const u of urls) {
    let path;
    try {
      const url = new URL(u.loc);
      if (!/^https?:$/.test(url.protocol) || u.loc !== u.loc.trim()) throw new Error();
      path = url.pathname;
    } catch {
      fail('sitemap.xml', `not an absolute URL: "${u.loc}"`);
      continue;
    }
    if (isPrivate(path)) fail('sitemap.xml', `private URL ${u.loc}`);
    if (u.lastmod !== undefined && !ISO.test(u.lastmod)) fail('sitemap.xml', `lastmod not ISO 8601 for ${u.loc}: ${u.lastmod}`);
  }
  for (const p of ['/', '/blog', '/termos-de-uso', '/politica-de-privacidade']) {
    if (!urls.some((u) => { try { return new URL(u.loc).pathname === p; } catch { return false; } })) fail('sitemap.xml', `missing ${p}`);
  }
  return urls;
}

async function checkRobots() {
  const r = await get('/robots.txt');
  if (r.status !== 200) return fail('robots.txt', `status ${r.status}`);
  if (!/^Sitemap:\s*https?:\/\/\S+\/sitemap\.xml\s*$/im.test(r.body)) fail('robots.txt', 'no absolute "Sitemap: …/sitemap.xml"');
  for (const p of ['/admin', '/api/', '/app/', '/entrar', '/cadastro', '/blog/preview/']) {
    if (!new RegExp(`^Disallow:\\s*${p.replace(/[/$]/g, '\\$&')}\\s*$`, 'im').test(r.body)) fail('robots.txt', `no "Disallow: ${p}"`);
  }
}

/** expected = JSON-LD @type that must appear (any of), or null when the page needs none. */
async function checkPage(path, expected) {
  const r = await get(path);
  if (r.status !== 200) return fail(path, `status ${r.status}`);
  const html = r.body;
  if (!/<html[^>]*\blang="pt-BR"/i.test(html)) fail(path, 'no <html lang="pt-BR">');
  if (!/<title>[^<]+<\/title>/.test(html)) fail(path, 'no <title>');
  if (!meta(html, 'name', 'description')) fail(path, 'no meta description');
  const canonical = tags(html, 'link').find((a) => a.rel === 'canonical')?.href;
  if (!canonical || !/^https?:\/\//.test(canonical)) fail(path, `canonical not absolute: ${canonical ?? 'missing'}`);
  const robots = meta(html, 'name', 'robots');
  if (robots && /noindex/i.test(robots)) fail(path, `robots "${robots}" on an indexable page`);
  if (!meta(html, 'property', 'og:title')) fail(path, 'no og:title');
  if (!meta(html, 'property', 'og:image')) fail(path, 'no og:image');
  if (!meta(html, 'name', 'twitter:card')) fail(path, 'no twitter:card');
  const types = new Set();
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const walk = (v) => {
        if (Array.isArray(v)) return v.forEach(walk);
        if (v && typeof v === 'object') {
          if (v['@type']) [v['@type']].flat().forEach((t) => types.add(t));
          Object.values(v).forEach(walk);
        }
      };
      walk(JSON.parse(m[1]));
    } catch {
      fail(path, 'JSON-LD does not parse');
    }
  }
  if (expected && !expected.some((t) => types.has(t))) fail(path, `JSON-LD without @type ${expected.join(' | ')} (found: ${[...types].join(', ') || 'none'})`);
  const h1 = (html.match(/<h1\b/gi) ?? []).length;
  if (h1 !== 1) fail(path, `${h1} <h1> (expected 1)`);
  for (const img of tags(html, 'img')) {
    for (const a of ['alt', 'width', 'height']) if (!(a in img)) fail(path, `<img src="${img.src ?? '?'}"> without ${a}`);
  }
}

try {
  const urls = await checkSitemap();
  await checkRobots();
  await checkPage('/', ['WebSite', 'Organization']);
  await checkPage('/blog', null); // FR-24: BreadcrumbList only on categories and posts
  await checkPage('/termos-de-uso', null);
  const post = urls.map((u) => { try { return new URL(u.loc).pathname; } catch { return ''; } }).find((p) => /^\/blog\/(?!categoria\/)[^/]+$/.test(p));
  if (post) await checkPage(post, ['BlogPosting']);
  else console.warn('seo:check: no post in the sitemap (API without posts?), post sample skipped');
} catch (e) {
  fail(BASE, `unreachable: ${e instanceof Error ? e.message : e}`);
}

if (failures.length) {
  console.error(`seo:check failed (${failures.length}) on ${BASE}:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`seo:check ok on ${BASE}`);
