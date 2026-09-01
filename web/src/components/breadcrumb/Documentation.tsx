import { useLocation } from 'react-router';
import { decodePathSegment, startCase } from '@/lib/utils';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';

const routeLabels: Record<string, string> = {
    docs: 'Documentation',
    api: 'Platform',
    sdk: 'Applications',
    pages: 'Pages',
};

/** Renders breadcrumbs for the current documentation URL. */
export function DocumentationBreadcrumb({ className }: { className?: string }) {
    const { pathname } = useLocation();
    const segments = pathname.split('/').filter(Boolean);

    return (
        <Breadcrumbs className={className} separator=">" variant="supporting">
            {segments.map((segment, index) => {
                const isLast = index === segments.length - 1;
                const href = `/${segments.slice(0, index + 1).join('/')}`;

                return (
                    <BreadcrumbItem key={href} href={isLast ? undefined : href} isCurrent={isLast}>
                        {routeLabels[segment] ?? startCase(decodePathSegment(segment))}
                    </BreadcrumbItem>
                );
            })}
        </Breadcrumbs>
    );
}
