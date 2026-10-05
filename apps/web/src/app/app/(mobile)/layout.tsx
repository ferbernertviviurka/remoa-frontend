import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return <main className="mx-auto max-w-md p-4">{children}</main>;
}
