import { stoneTheme } from '@/theme';
import { Theme } from '@astryxdesign/core/theme';
import { useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { createQueryClient } from '@/lib/react-query';
import { LinkProvider } from '@astryxdesign/core/Link';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { QueryClientProvider } from '@tanstack/react-query';

/** Provides the shared Astryx theme, routing, and overlay infrastructure. */
export function AstryxProvider({ children }: { children: ReactNode }) {
    return (
        <Theme theme={stoneTheme} mode="dark">
            <LinkProvider component={RouterLink}>
                <LayerProvider toast={{ position: 'bottomEnd' }}>{children}</LayerProvider>
            </LinkProvider>
        </Theme>
    );
}

/** Provides isolated query state with the shared application provider tree. */
export function RootProvider({ children }: { children: ReactNode }) {
    const [client] = useState(createQueryClient);

    return (
        <QueryClientProvider client={client}>
            <AstryxProvider>{children}</AstryxProvider>
        </QueryClientProvider>
    );
}
