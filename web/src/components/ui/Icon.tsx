import { useQuery } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import { stoneIconComponents } from '@/lib/glyphs';
import type { IconName } from 'lucide-react/dynamic';
import { Icon as AstryxIcon } from '@astryxdesign/core/Icon';
import { AlertTriangle, createLucideIcon, type LucideIconData } from 'lucide-react';

export type StoneIconName = keyof typeof stoneIconComponents | IconName | `lucide:${IconName}`;

// Native pages and isolated Views supply separate loaders for the same public icon contract.
export const IconRequestContext = createContext<((name: string) => Promise<LucideIconData>) | null>(null);

// A blank Lucide glyph retains the requested Astryx dimensions while an icon loads.
const emptyIcon = createLucideIcon({ size: 24, node: [] });

/** Renders any Lucide icon by its kebab-case name. Existing LongLink aliases remain immediate; other icons load on demand and are cached without blocking the View or changing icon dimensions. */
export function Icon({
    icon,
    size,
    hidden,
}: {
    /** Hides the component without unmounting it. */
    hidden?: boolean;
    /** Lucide kebab-case name or LongLink alias. Prefix with lucide: to bypass an existing alias, such as lucide:logs. */
    icon: StoneIconName;
    size: 'sm' | 'md' | 'lg';
}) {
    // Resolve existing LongLink names synchronously without mounting a query or loading another chunk.
    if (Object.hasOwn(stoneIconComponents, icon)) {
        // SAFETY: The own-property check restricts the lookup to the bundled icon names.
        const component = stoneIconComponents[icon as keyof typeof stoneIconComponents];

        return <AstryxIcon icon={component} size={size} className={hidden ? 'hidden!' : undefined} />;
    }

    // Explicit Lucide names bypass legacy aliases but share the same on-demand cache.
    return <DeferredIcon icon={icon.startsWith('lucide:') ? icon.slice(7) : icon} size={size} hidden={hidden} />;
}

/** Caches on-demand glyphs without suspending the containing page or changing icon dimensions. */
function DeferredIcon({ icon, size, hidden }: { icon: string; size: 'sm' | 'md' | 'lg'; hidden?: boolean }) {
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
    return (
        <AstryxIcon
            icon={component ?? (isError ? AlertTriangle : emptyIcon)}
            size={size}
            className={hidden ? 'hidden!' : undefined}
        />
    );
}
