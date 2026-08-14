import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { Link as RouterLink } from 'react-router';
import { LinkProvider } from '@astryxdesign/core/Link';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { stoneTheme } from '@/theme';

type AstryxRouterLinkProps = Omit<ComponentPropsWithoutRef<'a'>, 'href'> & { href: string };

/** Adapts Astryx link props to React Router navigation. */
function AstryxRouterLink({ href, ...props }: AstryxRouterLinkProps) {
    return <RouterLink to={href} {...props} />;
}

/** Provides the shared Astryx theme, routing, and overlay infrastructure. */
export function AstryxProvider({ children }: { children: ReactNode }) {
    return (
        <Theme theme={stoneTheme} mode="dark">
            <LinkProvider component={AstryxRouterLink}>
                <LayerProvider toast={{ position: 'bottomEnd' }}>{children}</LayerProvider>
            </LinkProvider>
        </Theme>
    );
}
