import { useContext } from 'react';
import { IconRequestContext } from './contexts';
import { useQuery } from '@tanstack/react-query';
import type { IconName } from 'lucide-react/dynamic';
import { TriangleExclamationPoint, createLucideIcon } from 'lucide-react';

// A blank Lucide glyph retains the requested dimensions while an icon loads.
const emptyIcon = createLucideIcon({ size: 24, node: [] });

const iconSizes = { sm: 'size-4', md: 'size-5', lg: 'size-6' };

/** Caches on-demand glyphs without suspending the containing page or changing icon dimensions. */
export function Icon({ icon, size }: { icon: IconName; size: 'sm' | 'md' | 'lg' }) {
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
        retry: 1
    });

    // Keep labeled controls usable even if an icon cannot be loaded.
    const Component = component ?? (isError ? TriangleExclamationPoint : emptyIcon);

    return <Component aria-hidden="true" className={`shrink-0 ${iconSizes[size]}`} data-size={size} />;
}
