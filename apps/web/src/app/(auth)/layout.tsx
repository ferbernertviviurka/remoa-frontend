import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center p-4">{children}</main>;
}
