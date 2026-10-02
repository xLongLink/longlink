import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { buildBreadcrumbs } from '@/components/breadcrumb/text';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';

/** Renders breadcrumb items derived from the current URL path. */
export function PathBreadcrumb({
    className,
    labels,
    root,
}: {
    className?: string;
    labels?: Record<string, string>;
    root?: ReactNode;
}) {
    const { pathname } = useLocation();
    const items = buildBreadcrumbs(pathname, labels);

    return (
        <Breadcrumbs className={className} separator=">" variant="supporting">
            {root}
            {items.map(({ label, href }, index) => {
                const isLast = index === items.length - 1;

                return (
                    <BreadcrumbItem key={href} href={isLast ? undefined : href} isCurrent={isLast}>
                        {label}
                    </BreadcrumbItem>
                );
            })}
        </Breadcrumbs>
    );
}
