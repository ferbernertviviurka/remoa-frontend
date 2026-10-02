import { useState } from 'react';

/** Estado controlado/não controlado: `value` definido vence o estado interno. */
export function useControlled<T>(value: T | undefined, initial: T): [T, (v: T) => void] {
  const [inner, setInner] = useState(initial);
  return [value !== undefined ? value : inner, setInner];
}
