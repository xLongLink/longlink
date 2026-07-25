import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { Link as RouterLink } from 'react-router';
import { LinkProvider } from '@astryxdesign/core/Link';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { longlinkNeutralDefaultTheme } from '@/lib/generated/longlink-neutral-default.js';
import { DEFAULT_RADIUS, getAstryxTheme, type Accent, type Theme as ThemeMode } from '@/lib/theme';

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
    const theme =
        accent === 'neutral' && radius === DEFAULT_RADIUS
            ? longlinkNeutralDefaultTheme
            : getAstryxTheme(accent, radius);

    return (
        <Theme theme={theme} mode={mode}>
            <LinkProvider component={AstryxRouterLink}>
                <LayerProvider toast={{ position: 'bottomEnd' }}>{children}</LayerProvider>
            </LinkProvider>
        </Theme>
    );
}
