import startCase from 'lodash/startCase';
import { useLocation } from 'react-router';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';
import { Wordmark } from '@/components/Wordmark';

type BreadcrumbProps = {
    article?: boolean;
    className?: string;
};

const routeLabels: Record<string, string> = {
    docs: 'Documentation',
    api: 'Platform',
    sdk: 'Applications',
    pages: 'Pages',
};

/** Renders route-derived breadcrumbs for platform headers and articles. */
export function Breadcrumb({ article = false, className }: BreadcrumbProps) {
    const { pathname } = useLocation();

    if (article) {
        const segments = pathname.split('/').filter(Boolean);
        const items = segments.map((segment, index) => ({
            href: `/${segments.slice(0, index + 1).join('/')}`,
            label: routeLabels[segment] ?? startCase(decodeURIComponent(segment)),
        }));

        if (segments[0] !== 'docs') {
            items.unshift({ href: '/', label: 'Home' });
        }

        return (
            <Breadcrumbs className={className} separator=">" variant="supporting">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;

                    return (
                        <BreadcrumbItem key={item.href} href={isLast ? undefined : item.href} isCurrent={isLast}>
                            {item.label}
                        </BreadcrumbItem>
                    );
                })}
            </Breadcrumbs>
        );
    }

    const organization = pathname.split('/')[2];
    const label = pathname.startsWith('/admin/') ? 'Admin' : startCase(decodeURIComponent(organization));

    return (
        <Breadcrumbs className={className} separator=">" variant="supporting">
            <BreadcrumbItem href="/organizations">
                <Wordmark />
            </BreadcrumbItem>
            <BreadcrumbItem isCurrent>{label}</BreadcrumbItem>
        </Breadcrumbs>
    );
}
