import React, { Suspense } from 'react';
import dynamicIconImports from 'lucide-react/dynamicIconImports';
import type { LucideIcon, LucideProps } from 'lucide-react';

type IconModule = {
    default: LucideIcon;
};

const iconImporters = dynamicIconImports as Record<
    string,
    () => Promise<IconModule>
>;

const lazyIcons: Record<string, React.LazyExoticComponent<LucideIcon>> = {};

for (const [iconName, importer] of Object.entries(iconImporters)) {
    lazyIcons[iconName] = React.lazy(importer);
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

export function Icon({ name, fallback = 'box', ...props }: IconProps) {
    const iconName = toKebabCase(name ?? fallback);

    const Component = lazyIcons[iconName] ?? lazyIcons[toKebabCase(fallback)];

    return (
        <Suspense fallback={null}>
            {Component ? <Component {...props} /> : null}
        </Suspense>
    );
}
