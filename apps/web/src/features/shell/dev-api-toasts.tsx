'use client';

import { useEffect } from 'react';
import { useToast } from '@remoa/ui';
import type { ApiErrorDetail } from '@/lib/api';

/**
 * Dev only, opt-in with NEXT_PUBLIC_API_DEBUG=1 (D-583): every failed browser call to the API becomes a toast with the route, status
 * and the typed error, so a failure the screen swallows is still seen. Debug output for the developer, not product copy (hence no t()).
 * Off by default because e2e reuses the dev server and asserts on toasts.
 */
export function DevApiToasts() {
  const { toast } = useToast();
  useEffect(() => {
    const onError = (e: Event) => {
      const { method, path, status, error } = (e as CustomEvent<ApiErrorDetail>).detail;
      toast({ title: `${method} ${path} -> ${status}`, description: `${error.code}: ${error.message}`, tone: 'danger' });
    };
    window.addEventListener('remoa:api-error', onError);
    return () => window.removeEventListener('remoa:api-error', onError);
  }, [toast]);
  return null;
}
