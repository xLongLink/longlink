import React, { Suspense } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import dynamicIconImports from 'lucide-react/dynamicIconImports';

type IconProps = LucideProps & {
    name: string;
    fallback?: string;
};

const lazyIcons: Record<string, React.LazyExoticComponent<LucideIcon>> = {};

function resolveLazyIcon(name: string): React.LazyExoticComponent<LucideIcon> | undefined {
    if (lazyIcons[name]) {
        return lazyIcons[name];
    }

    const importer = dynamicIconImports[name as keyof typeof dynamicIconImports];

    if (!importer) {
        return undefined;
    }

    const lazyIcon = React.lazy(importer as () => Promise<{ default: LucideIcon }>);
    lazyIcons[name] = lazyIcon;

    return lazyIcon;
}

/* 
    Simple icon component that dynamically imports icons from lucide-react based on the provided name prop.
*/
export function Icon({ name, fallback = 'box', ...props }: IconProps) {
    const Component = resolveLazyIcon(name) ?? resolveLazyIcon(fallback);

    if (!Component) return null;

    return (
        <Suspense fallback={null}>
            <Component {...props} />
        </Suspense>
    );
}
