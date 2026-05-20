import {
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
    Breadcrumb as UIBreadcrumb,
} from '@ui/breadcrumb';
import startCase from 'lodash/startCase';
import { Fragment } from 'react';
import { Link, useLocation } from 'react-router';

/**
 * Render the top navigation breadcrumb for organization, app, and profile routes.
 */
export function Breadcrumb() {
    const { pathname } = useLocation();
    const segments = pathname.split('/').filter(Boolean);

    // Build one breadcrumb item per visible path segment.
    const crumbs = segments.map((segment, index) => ({
        label: startCase(segment),
        href: `/${segments.slice(0, index + 1).join('/')}`,
    }));

    return (
        <UIBreadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem>
                    <Link to="/" aria-label="LongLink home" className="inline-flex items-center pr-2 hover:underline">
                        <img src="/favicon.ico" alt="LongLink favicon" className="size-8" />
                    </Link>
                </BreadcrumbItem>
                {crumbs.map((crumb, index) => (
                    <Fragment key={crumb.href}>
                        {index > 0 ? <BreadcrumbSeparator /> : null}
                        <BreadcrumbItem>
                            <BreadcrumbLink
                                render={(props) => (
                                    <Link
                                        {...props}
                                        to={crumb.href}
                                        className="text-sm font-semibold text-muted-foreground hover:text-foreground hover:underline"
                                    >
                                        {crumb.label}
                                    </Link>
                                )}
                            />
                        </BreadcrumbItem>
                    </Fragment>
                ))}
            </BreadcrumbList>
        </UIBreadcrumb>
    );
}
