import type { ReactNode } from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { Link as RouterLink } from 'react-router';
import { LinkProvider } from '@astryxdesign/core/Link';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { stoneTheme } from '@/theme';

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
