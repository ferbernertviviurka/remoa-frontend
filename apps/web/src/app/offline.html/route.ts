import { t } from '@remoa/strings';

// F09 FR-6: static-looking offline page served at /offline.html (the service worker precaches it). Built from @remoa/strings so no text lives outside the dictionary (D-505).
export const dynamic = 'force-static';

const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#6D5BD0" />
    <title>${t('common.appName')}</title>
    <style>
      body {
        margin: 0;
        min-height: 100dvh;
        background: #f6f5fb;
        color: #1c1730;
        font: 16px/1.5 system-ui, sans-serif;
        padding: 24px;
      }
      main { max-width: 32rem; margin: 0 auto; }
      h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
      h2 { font-size: 1.125rem; margin: 0 0 0.5rem; }
      p { margin: 0 0 0.75rem; }
      label { display: block; font-weight: 600; margin-bottom: 0.75rem; }
      textarea {
        display: block;
        width: 100%;
        box-sizing: border-box;
        min-height: 6rem;
        margin-top: 0.35rem;
        border: 1px solid #d9d4ea;
        border-radius: 12px;
        padding: 12px;
        font: inherit;
        background: #fff;
        color: inherit;
      }
      button {
        min-height: 44px;
        margin: 0 8px 8px 0;
        border: 0;
        border-radius: 12px;
        padding: 0 16px;
        background: #6d5bd0;
        color: #fff;
        font: inherit;
        font-weight: 700;
      }
      button.secondary { background: #fff; color: #1c1730; border: 1px solid #d9d4ea; }
      button[aria-pressed="true"] { outline: 2px solid #1c1730; }
      #rate p { color: #5c5672; }
    </style>
  </head>
  <body>
    <main id="empty">
      <h1>${t('offline.emptyTitle')}</h1>
      <p>${t('offline.emptyBody')}</p>
    </main>
    <main id="review" hidden>
      <h1>${t('offline.reviewTitle')}</h1>
      <p id="count"></p>
      <h2 id="title"></h2>
      <p id="prompt"></p>
      <div id="compose">
        <label id="text-label">${t('offline.answerLabel')}
          <textarea id="text"></textarea>
        </label>
        <div id="options"></div>
        <button type="button" id="send">${t('offline.send')}</button>
      </div>
      <div id="rate" hidden>
        <p>${t('offline.rateNote')}</p>
        <button type="button" data-grade="again">${t('offline.again')}</button>
        <button type="button" data-grade="hard" class="secondary">${t('offline.hard')}</button>
        <button type="button" data-grade="good" class="secondary">${t('offline.good')}</button>
        <button type="button" data-grade="easy" class="secondary">${t('offline.easy')}</button>
      </div>
    </main>
    <main id="done" hidden>
      <h1>${t('offline.doneTitle')}</h1>
      <p>${t('offline.doneBody')}</p>
    </main>
    <script>
      window.addEventListener('online', () => location.reload());
      const LAST = 'remoa-last-session';
      const QUEUE = 'remoa-offline-answers';
      const STEP = 'remoa-offline-step';

      function readQueue() {
        try {
          const raw = JSON.parse(localStorage.getItem(QUEUE) || '[]');
          return Array.isArray(raw) ? raw : [];
        } catch {
          return [];
        }
      }

      function enqueue(path, body) {
        const next = readQueue().concat([{ path: path, body: body }]).slice(-30);
        localStorage.setItem(QUEUE, JSON.stringify(next));
      }

      function session() {
        try {
          const saved = JSON.parse(localStorage.getItem(LAST) || 'null');
          if (!saved || !saved.data || typeof saved.data.sessionId !== 'string' || !Array.isArray(saved.data.items)) return null;
          return saved.data;
        } catch {
          return null;
        }
      }

      function show(id) {
        for (const name of ['empty', 'review', 'done']) {
          document.getElementById(name).hidden = name !== id;
        }
      }

      const data = session();
      if (!data || data.items.length === 0) {
        show('empty');
      } else {
        let step = 0;
        try {
          const saved = JSON.parse(sessionStorage.getItem(STEP) || 'null');
          if (saved && saved.sessionId === data.sessionId && Number.isInteger(saved.i)) step = saved.i;
        } catch {
          step = 0;
        }
        let started = Date.now();
        let choice = null;
        const title = document.getElementById('title');
        const prompt = document.getElementById('prompt');
        const count = document.getElementById('count');
        const text = document.getElementById('text');
        const options = document.getElementById('options');
        const compose = document.getElementById('compose');
        const rate = document.getElementById('rate');
        const textLabel = document.getElementById('text-label');

        function paint() {
          if (step >= data.items.length) {
            enqueue('finish', { sessionId: data.sessionId });
            localStorage.removeItem(LAST);
            sessionStorage.removeItem(STEP);
            show('done');
            return;
          }
          const item = data.items[step];
          show('review');
          started = Date.now();
          choice = null;
          title.textContent = typeof item.cardTitle === 'string' ? item.cardTitle : '';
          prompt.textContent = typeof item.prompt === 'string' ? item.prompt : '';
          count.textContent = (step + 1) + ' de ' + data.items.length;
          text.value = '';
          compose.hidden = false;
          rate.hidden = true;
          options.replaceChildren();
          const choices = Array.isArray(item.options) ? item.options : [];
          textLabel.hidden = choices.length === 4;
          choices.forEach(function (label, index) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'secondary';
            button.textContent = String(label);
            button.addEventListener('click', function () {
              choice = index;
              for (const other of options.querySelectorAll('button')) other.setAttribute('aria-pressed', 'false');
              button.setAttribute('aria-pressed', 'true');
            });
            options.appendChild(button);
          });
          sessionStorage.setItem(STEP, JSON.stringify({ sessionId: data.sessionId, i: step }));
        }

        document.getElementById('send').addEventListener('click', function () {
          const item = data.items[step];
          if (!item || typeof item.id !== 'string') return;
          const body = { sessionId: data.sessionId, itemId: item.id, durationMs: Date.now() - started };
          if (choice != null) {
            body.inputKind = 'mcq';
            body.optionIndex = choice;
          } else {
            const value = text.value.trim();
            if (!value) return;
            body.inputKind = 'text';
            body.text = value;
          }
          enqueue('answer', body);
          compose.hidden = true;
          rate.hidden = false;
        });

        rate.addEventListener('click', function (event) {
          const grade = event.target && event.target.getAttribute && event.target.getAttribute('data-grade');
          const item = data.items[step];
          if (!grade || !item || typeof item.id !== 'string') return;
          enqueue('rate', { sessionId: data.sessionId, itemId: item.id, grade: grade, overridden: false });
          step += 1;
          paint();
        });

        paint();
      }
    </script>
  </body>
</html>
`;

export function GET() {
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
