import { LayerProvider } from '@astryxdesign/core/Layer';
import { LinkProvider } from '@astryxdesign/core/Link';
import { Theme } from '@astryxdesign/core/theme';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { DEFAULT_RADIUS, getAstryxTheme, type Accent, type Theme as ThemeMode } from '@/lib/theme';
import { stoneTheme } from '@/themes/stone/stoneTheme';

type AstryxRouterLinkProps = Omit<ComponentPropsWithoutRef<'a'>, 'href'> & { href: string };

/** Adapts Astryx link props to React Router navigation. */
function AstryxRouterLink({ href, ...props }: AstryxRouterLinkProps) {
    return <RouterLink to={href} {...props} />;
}

/** Provides the shared Astryx theme, routing, and overlay infrastructure. */
export function AstryxProvider({
    accent = 'neutral',
    children,
    mode,
    radius = DEFAULT_RADIUS,
}: {
    accent?: Accent;
    children: ReactNode;
    mode: ThemeMode;
    radius?: number;
}) {
    return (
        <Theme
            theme={accent === 'neutral' && radius === DEFAULT_RADIUS ? stoneTheme : getAstryxTheme(accent, radius)}
            mode={mode}
        >
            <LinkProvider component={AstryxRouterLink}>
                <LayerProvider toast={{ position: 'bottomEnd' }}>{children}</LayerProvider>
            </LinkProvider>
        </Theme>
    );
}
