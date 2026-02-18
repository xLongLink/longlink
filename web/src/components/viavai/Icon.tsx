import React, { Suspense } from 'react';
import type { LucideProps, LucideIcon } from 'lucide-react';

type IconModule = {
    default: LucideIcon;
};

const iconImporters = import.meta.glob<IconModule>(
    '/node_modules/lucide-react/dist/esm/icons/*.js'
);

const lazyIcons: Record<
    string,
    React.LazyExoticComponent<LucideIcon>
> = {};

// Build once at module load
for (const path in iconImporters) {
    const match = path.match(/icons\/(.*)\.js$/);
    if (!match) continue;

    const iconName = match[1]; // already kebab-case
    lazyIcons[iconName] = React.lazy(iconImporters[path]);
}

function toKebabCase(value: string): string {
    return value
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[_\s]+/g, '-')
        .toLowerCase();
}

type IconProps = LucideProps & {
    name?: string | null;
    fallback?: string;
};

export function Icon({
    name,
    fallback = 'box',
    ...props
}: IconProps) {
    const iconName = toKebabCase(name ?? fallback);

    const Component =
        lazyIcons[iconName] ??
        lazyIcons[toKebabCase(fallback)];

    if (!Component) return null;

    return (
        <Suspense fallback={null}>
            <Component {...props} />
        </Suspense>
    );
}
