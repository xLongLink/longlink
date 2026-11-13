import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';

/** Renders a supporting breadcrumb trail for trusted Platform pages. */
export function Breadcrumbs({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <nav aria-label="Breadcrumb" className={`native-breadcrumb${className ? ` ${className}` : ''}`}>
            <ol>{children}</ol>
        </nav>
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
        <li className="native-breadcrumb-item">
            <span aria-hidden="true" className="native-breadcrumb-separator">
                &gt;
            </span>
            {href !== undefined && !isCurrent ? (
                <RouterLink to={href} className="native-breadcrumb-label">
                    {children}
                </RouterLink>
            ) : (
                <span className="native-breadcrumb-label" aria-current={isCurrent ? 'page' : undefined}>
                    {children}
                </span>
            )}
        </li>
    );
}
