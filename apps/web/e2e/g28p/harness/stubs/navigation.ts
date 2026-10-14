export const useRouter = () => ({ push: (p: string) => { (window as unknown as { __nav: string[] }).__nav = [...((window as unknown as { __nav?: string[] }).__nav ?? []), p]; }, replace: (p: string) => { (window as unknown as { __nav: string[] }).__nav = [...((window as unknown as { __nav?: string[] }).__nav ?? []), p]; }, refresh: () => undefined, back: () => undefined, prefetch: () => undefined });
export const usePathname = () => new URLSearchParams(location.search).get('path') ?? '/app/hoje';
export const useSearchParams = () => new URLSearchParams(location.search);
export const notFound = () => { throw new Error('notFound'); };
export const redirect = (p: string) => { throw new Error('redirect ' + p); };
