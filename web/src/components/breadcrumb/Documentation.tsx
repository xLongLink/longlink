import startCase from 'lodash/startCase';
import { useLocation } from 'react-router';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';

type DocumentationBreadcrumbProps = {
    className?: string;
};

const routeLabels: Record<string, string> = {
    docs: 'Documentation',
    api: 'Platform',
    sdk: 'Applications',
    pages: 'Pages',
};

/** Renders breadcrumbs for the current documentation URL. */
export function DocumentationBreadcrumb({ className }: DocumentationBreadcrumbProps) {
    const { pathname } = useLocation();
    const segments = pathname.split('/').filter(Boolean);

    return (
        <Breadcrumbs className={className} separator=">" variant="supporting">
            {segments.map((segment, index) => {
                const isLast = index === segments.length - 1;
                const href = `/${segments.slice(0, index + 1).join('/')}`;

                return (
                    <BreadcrumbItem key={href} href={isLast ? undefined : href} isCurrent={isLast}>
                        {routeLabels[segment] ?? startCase(decodeURIComponent(segment))}
                    </BreadcrumbItem>
                );
            })}
        </Breadcrumbs>
    );
}
