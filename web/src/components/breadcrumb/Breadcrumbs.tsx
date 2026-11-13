import { cn } from 'cn';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import {
    Breadcrumb,
    BreadcrumbItem as BreadcrumbEntry,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/shadcn/breadcrumb';

/** Renders a supporting breadcrumb trail for trusted Platform pages. */
export function Breadcrumbs({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <Breadcrumb aria-label="Breadcrumb" className={cn('min-w-0 overflow-hidden', className)}>
            <BreadcrumbList>{children}</BreadcrumbList>
        </Breadcrumb>
    );
}

/** Keeps ancestor links native while marking the current page without a redundant link. */
export function BreadcrumbItem({
    children,
    href,
    isCurrent = false,
}: {
    children: ReactNode;
    href?: string;
    isCurrent?: boolean;
}) {
    return (
        <>
            <BreadcrumbSeparator className="first:hidden" />
            <BreadcrumbEntry className="min-w-0 max-w-full">
                {href !== undefined && !isCurrent ? (
                    <BreadcrumbLink render={<RouterLink to={href} />} className="min-w-0 truncate">
                        {children}
                    </BreadcrumbLink>
                ) : isCurrent ? (
                    <BreadcrumbPage className="min-w-0 truncate">{children}</BreadcrumbPage>
                ) : (
                    <span className="min-w-0 truncate">{children}</span>
                )}
            </BreadcrumbEntry>
        </>
    );
}
