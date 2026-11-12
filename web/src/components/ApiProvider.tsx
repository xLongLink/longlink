import { ApiErrorContext } from '@/lib/errors';
import { useState, type ReactNode } from 'react';
import { useToast } from '@/components/astryx/Toast';
import { createQueryRuntime } from '@/lib/react-query';
import { QueryClientProvider } from '@tanstack/react-query';

/** Connects cache and direct-request failures to the notification layer. */
export function ApiProvider({ children }: { children: ReactNode }) {
    const toast = useToast();

    const [runtime] = useState(() =>
        createQueryRuntime(
            (body) => {
                toast({ body, type: 'error', isAutoHide: true });
            },
            import.meta.env.MODE !== 'sdk'
        )
    );

    return (
        <ApiErrorContext value={runtime.reportError}>
            <QueryClientProvider client={runtime.client}>{children}</QueryClientProvider>
        </ApiErrorContext>
    );
}
