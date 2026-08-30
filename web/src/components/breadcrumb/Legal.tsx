import { useLocation } from 'react-router';
import { decodePathSegment, startCase } from '@/lib/utils';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';

type LegalBreadcrumbProps = {
    className?: string;
};

/** Renders breadcrumbs for the current legal article URL. */
export function LegalBreadcrumb({ className }: LegalBreadcrumbProps) {
    const { pathname } = useLocation();
    const segments = pathname.split('/').filter(Boolean);

    return (
        <Breadcrumbs className={className} separator=">" variant="supporting">
            <BreadcrumbItem href="/">Home</BreadcrumbItem>
            {segments.map((segment, index) => {
                const isLast = index === segments.length - 1;
                const href = `/${segments.slice(0, index + 1).join('/')}`;

                return (
                    <BreadcrumbItem key={href} href={isLast ? undefined : href} isCurrent={isLast}>
                        {startCase(decodePathSegment(segment))}
                    </BreadcrumbItem>
                );
            })}
        </Breadcrumbs>
    );
}
