import '@testing-library/jest-dom/vitest';


Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

Element.prototype.animate ??= () =>
  ({
    cancel() {},
    finish() {},
    play() {},
    pause() {},
    persist() {},
    commitStyles() {},
    addEventListener() {},
    removeEventListener() {},
    finished: Promise.resolve(),
    ready: Promise.resolve(),
    playState: 'finished',
    pending: false,
  }) as unknown as Animation;
Element.prototype.getAnimations ??= () => [];
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => undefined;
Element.prototype.releasePointerCapture ??= () => undefined;

// jsdom has no PointerEvent (mask editor and dnd-kit use pointer events).
window.PointerEvent ??= class PointerEvent extends MouseEvent {
  pointerId: number;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
  }
} as unknown as typeof window.PointerEvent;
