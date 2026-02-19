import React, { Suspense } from 'react';
import type { LucideProps, LucideIcon } from 'lucide-react';

type IconModule = {
    default: LucideIcon;
};

const iconImporters = import.meta.glob<IconModule>('/node_modules/lucide-react/dist/esm/icons/*.js');
const lazyIcons: Record<string, React.LazyExoticComponent<LucideIcon>> = {};


// Build once at module load
for (const path in iconImporters) {
    const match = path.match(/icons\/(.*)\.js$/);
    if (!match) continue;

    const iconName = match[1]; // already kebab-case
    lazyIcons[iconName] = React.lazy(iconImporters[path]);
}


type IconProps = LucideProps & {
    name: string;
    fallback?: string;
};

/* 
    Simple icon component that dynamically imports icons from lucide-react based on the provided name prop.
*/
export function Icon({ name, fallback = 'box' }: IconProps) {
    const Component = lazyIcons[name] ?? lazyIcons[fallback];

    if (!Component) return null;

    return (
        <Suspense fallback={null}>
            <Component />
        </Suspense>
    );
}
