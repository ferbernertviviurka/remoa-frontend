import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Markdown, safeHref, stripMarkdown } from './markdown';

afterEach(cleanup);

describe('Markdown', () => {
  it('renders bold, italic, lists and links as elements', () => {
    const { container } = render(<Markdown text={'**Sepse** é *grave*\n\n- um\n- dois\n\n1. a\n2. b\n\nVer [SSC](https://example.org/ssc)'} />);
    expect(container.querySelector('strong')?.textContent).toBe('Sepse');
    expect(container.querySelector('em')?.textContent).toBe('grave');
    expect(container.querySelectorAll('ul li')).toHaveLength(2);
    expect(container.querySelectorAll('ol li')).toHaveLength(2);
    const a = container.querySelector('a')!;
    expect(a.getAttribute('href')).toBe('https://example.org/ssc');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('never injects HTML', () => {
    const { container } = render(<Markdown text={'<img src=x onerror=alert(1)> <script>alert(1)</script> **<b>x</b>**'} />);
    expect(container.querySelector('img, script, b')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });

  it('drops javascript:, data: and relative links (text stays)', () => {
    const { container } = render(<Markdown text={'[a](javascript:alert(1)) [b](data:text/html,x) [c](/rel)'} />);
    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toContain('a');
    expect(safeHref('JaVaScRiPt:alert(1)')).toBeNull();
    expect(safeHref('http://x.org')).toBe('http://x.org/');
  });

  it('keeps line breaks inside a paragraph', () => {
    const { container } = render(<Markdown text={'linha 1\nlinha 2'} />);
    expect(container.querySelectorAll('p')).toHaveLength(1);
    expect(container.querySelector('br')).not.toBeNull();
  });

  it('stripMarkdown gives plain text for the map summary', () => {
    expect(stripMarkdown('**Disfunção** orgânica\n- *com* risco\n1. ver [SSC](https://x.org)')).toBe('Disfunção orgânica com risco ver SSC');
  });
});
