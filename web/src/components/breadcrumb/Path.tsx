import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { decodePathSegment, startCase } from '@/lib/utils';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';

/** Renders breadcrumb items derived from the current URL path. */
export function PathBreadcrumb({
    className,
    labels = {},
    root,
}: {
    className?: string;
    labels?: Record<string, string>;
    root?: ReactNode;
}) {
    const { pathname } = useLocation();
    const segments = pathname.split('/').filter(Boolean);

    return (
        <Breadcrumbs className={className} separator=">" variant="supporting">
            {root}
            {segments.map((segment, index) => {
                const isLast = index === segments.length - 1;
                const href = `/${segments.slice(0, index + 1).join('/')}`;

                return (
                    <BreadcrumbItem key={href} href={isLast ? undefined : href} isCurrent={isLast}>
                        {labels[segment] ?? startCase(decodePathSegment(segment))}
                    </BreadcrumbItem>
                );
            })}
        </Breadcrumbs>
    );
}
