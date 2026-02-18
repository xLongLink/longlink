import React, { Suspense } from 'react';
import type { LucideProps, LucideIcon } from 'lucide-react';

type IconModule = {
    default: LucideIcon;
};

// Load all icon importers
const iconImporters = import.meta.glob<IconModule>(
    '/node_modules/lucide-react/dist/esm/icons/*.js'
);

// Build lazy components ONCE (module scope)
const lazyIcons: Record<string, React.LazyExoticComponent<LucideIcon>> = {};

for (const path in iconImporters) {
    const match = path.match(/icons\/(.*)\.js$/);
    if (!match) continue;

    const iconName = match[1]; // kebab-case
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
        lazyIcons[iconName] ?? lazyIcons[toKebabCase(fallback)];

    return (
        <Suspense fallback={null}>
            {Component ? <Component {...props} /> : null}
        </Suspense>
    );
}
