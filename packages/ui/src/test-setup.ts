import '@testing-library/jest-dom/vitest';

// jsdom não implementa pointer capture (usado pelo Radix Toast).
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => undefined;
Element.prototype.releasePointerCapture ??= () => undefined;
