import { useContext } from 'react';
import { IconRequestContext } from './contexts';
import { Stack } from '@astryxdesign/core/Stack';
import { useQuery } from '@tanstack/react-query';
import { stoneIconComponents } from '@/lib/glyphs';
import type { IconName } from 'lucide-react/dynamic';
import { Icon as AstryxIcon } from '@astryxdesign/core/Icon';
import { AlertTriangle, createLucideIcon } from 'lucide-react';

export type StoneIconName = keyof typeof stoneIconComponents | IconName | `lucide:${IconName}`;

// A blank Lucide glyph retains the requested Astryx dimensions while an icon loads.
const emptyIcon = createLucideIcon({ size: 24, node: [] });

type IconProps = {
    /** Lucide kebab-case name or LongLink alias. Prefix with lucide: to bypass an existing alias, such as lucide:logs. */
    icon: StoneIconName;
    size: 'sm' | 'md' | 'lg';
    /** Semantic theme color; inherits the surrounding text by default. */
    color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'inherit';
    /** Optional theme-sized icon tile for summary rows and object headers. */
    presentation?: 'plain' | 'tile';
};

/** Renders any Lucide icon by its kebab-case name. Existing LongLink aliases remain immediate; other icons load on demand and are cached without blocking the View or changing icon dimensions. */
export function Icon({ presentation = 'plain', ...props }: IconProps) {
    const glyph = <IconContent {...props} />;

    // Keep framed artwork aligned without changing the glyph or its loading lifecycle.
    if (presentation === 'plain') return glyph;

    const frameSize = props.size === 'lg' ? 'var(--spacing-12)' : 'var(--spacing-8)';

    return (
        <Stack
            direction="horizontal"
            hAlign="center"
            vAlign="center"
            gap={0}
            width={frameSize}
            height={frameSize}
            className="shrink-0 rounded-(--radius-element) bg-muted"
        >
            {glyph}
        </Stack>
    );
}

/** Resolves bundled and deferred artwork independently of its optional frame. */
function IconContent({ icon, size, color }: Omit<IconProps, 'presentation'>) {
    // Resolve existing LongLink names synchronously without mounting a query or loading another chunk.
    if (Object.hasOwn(stoneIconComponents, icon)) {
        // SAFETY: The own-property check restricts the lookup to the bundled icon names.
        const component = stoneIconComponents[icon as keyof typeof stoneIconComponents];

        return <AstryxIcon icon={component} size={size} color={color} />;
    }

    // Explicit Lucide names bypass legacy aliases but share the same on-demand cache.
    return <DeferredIcon icon={icon.startsWith('lucide:') ? icon.slice(7) : icon} size={size} color={color} />;
}

/** Caches on-demand glyphs without suspending the containing page or changing icon dimensions. */
export function DeferredIcon({ icon, size, color }: Omit<IconProps, 'icon' | 'presentation'> & { icon: string }) {
    const load = useContext(IconRequestContext);

    if (load === null) throw new Error('Icon requires IconRequestContext');

    // Share both in-flight work and rendered components for repeated uses of the same icon.
    const { data: component, isError } = useQuery({
        queryKey: ['icon', icon],
        queryFn: async () => {
            const data = await load(icon);

            return createLucideIcon(data);
        },
        staleTime: Infinity,
        gcTime: Infinity,
        retry: 1,
    });

    // Keep labeled controls usable even if an icon cannot be loaded.
    return <AstryxIcon icon={component ?? (isError ? AlertTriangle : emptyIcon)} size={size} color={color} />;
}
