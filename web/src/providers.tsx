import { stoneTheme } from '@/theme';
import { ApiErrorContext } from '@/lib/errors';
import { useToast } from '@/lib/hooks/use-toast';
import { Theme } from '@astryxdesign/core/theme';
import { useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { createQueryRuntime } from '@/lib/react-query';
import { LinkProvider } from '@astryxdesign/core/Link';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { QueryClientProvider } from '@tanstack/react-query';

/** Provides isolated query state with the shared application provider tree. */
export function RootProvider({ children }: { children: ReactNode }) {
    return (
        <Theme theme={stoneTheme} mode="dark">
            <LinkProvider component={RouterLink}>
                <LayerProvider toast={{ position: 'bottomEnd' }}>
                    <ApiProvider>{children}</ApiProvider>
                </LayerProvider>
            </LinkProvider>
        </Theme>
    );
}

/** Connects cache and direct-request failures to the shared notification layer. */
export function ApiProvider({ children }: { children: ReactNode }) {
    const toast = useToast();
    const [runtime] = useState(() =>
        createQueryRuntime((body) => toast({ body, type: 'error' }), import.meta.env.MODE !== 'sdk')
    );

    return (
        <ApiErrorContext value={runtime.reportError}>
            <QueryClientProvider client={runtime.client}>{children}</QueryClientProvider>
        </ApiErrorContext>
    );
}
