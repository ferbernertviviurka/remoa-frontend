import { anchor, route, routePoints } from './route';

const a = { x: 0, y: 0, w: 100, h: 50 };

describe('route', () => {
  it('âncoras no meio de cada lado', () => {
    expect(anchor(a, 'l')).toEqual([0, 25]);
    expect(anchor(a, 'r')).toEqual([100, 25]);
    expect(anchor(a, 't')).toEqual([50, 0]);
    expect(anchor(a, 'b')).toEqual([50, 50]);
  });
  it('mesma altura: linha reta, pílula no meio', () => {
    const r = route(a, 'r', { x: 200, y: 0, w: 100, h: 50 }, 'l');
    expect(r).toEqual({ d: 'M 100 25 L 200 25', lx: 150, ly: 25 });
  });
  it('horizontal com degrau: cantos com raio 14 e pílula no centro', () => {
    const r = route(a, 'r', { x: 200, y: 200, w: 100, h: 50 }, 'l');
    expect(r.d).toBe('M 100 25 L 136 25 Q 150 25 150 39 L 150 211 Q 150 225 164 225 L 200 225');
    expect([r.lx, r.ly]).toEqual([150, 125]);
  });
  it('raio limitado pela metade do menor desvio', () => {
    const r = route(a, 'r', { x: 110, y: 40, w: 100, h: 50 }, 'l'); // dx 10, dy 40 -> r = 5
    expect(r.d).toBe('M 100 25 L 100 25 Q 105 25 105 30 L 105 60 Q 105 65 110 65 L 110 65');
  });
  it('vertical: sai por baixo, degrau horizontal, entra por cima', () => {
    const r = route(a, 'b', { x: 200, y: 200, w: 100, h: 50 }, 't');
    expect(r.d).toBe('M 50 50 L 50 111 Q 50 125 64 125 L 236 125 Q 250 125 250 139 L 250 200');
    expect([r.lx, r.ly]).toEqual([150, 125]);
  });
  it('vertical alinhado: linha reta', () => {
    expect(route(a, 'b', { x: 0, y: 100, w: 100, h: 50 }, 't')).toEqual({ d: 'M 50 50 L 50 100', lx: 50, ly: 75 });
  });
  it('routePoints equivale a route', () => {
    expect(routePoints([100, 25], 'r', [200, 225])).toEqual(route(a, 'r', { x: 200, y: 200, w: 100, h: 50 }, 'l'));
  });
});
