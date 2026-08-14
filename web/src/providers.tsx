import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { Link as RouterLink } from 'react-router';
import { LinkProvider } from '@astryxdesign/core/Link';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { DEFAULT_RADIUS, getAstryxTheme, type Accent } from '@/lib/theme';

type AstryxRouterLinkProps = Omit<ComponentPropsWithoutRef<'a'>, 'href'> & { href: string };

/** Adapts Astryx link props to React Router navigation. */
function AstryxRouterLink({ href, ...props }: AstryxRouterLinkProps) {
    return <RouterLink to={href} {...props} />;
}

/** Provides the shared Astryx theme, routing, and overlay infrastructure. */
export function AstryxProvider({
    accent = 'neutral',
    children,
    radius = DEFAULT_RADIUS,
}: {
    accent?: Accent;
    children: ReactNode;
    radius?: number;
}) {
    return (
        <Theme theme={getAstryxTheme(accent, radius)} mode="dark">
            <LinkProvider component={AstryxRouterLink}>
                <LayerProvider toast={{ position: 'bottomEnd' }}>{children}</LayerProvider>
            </LinkProvider>
        </Theme>
    );
}
