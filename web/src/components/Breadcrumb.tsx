import {
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
    Breadcrumb as UIBreadcrumb,
} from '@/components/ui/breadcrumb';
import startCase from 'lodash/startCase';
import { Fragment } from 'react';
import { Link, useLocation } from 'react-router';

import { Wordmark } from '@/components/Wordmark';

/**
 * Render the top navigation breadcrumb for organization, app, and profile routes.
 */
export function Breadcrumb() {
    const { pathname } = useLocation();
    const segments = pathname.split('/').filter(Boolean);
    const hiddenSegments = new Set(['orgs', 'apps']);

    // Build one breadcrumb item per visible path segment while preserving the full route target.
    const crumbs = segments.flatMap((segment, index) => {
        if (hiddenSegments.has(segment)) {
            return [];
        }

        return [
            {
                label: startCase(segment),
                href: `/${segments.slice(0, index + 1).join('/')}`,
            },
        ];
    });

    return (
        <UIBreadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem>
                    <Link to="/organizations" aria-label="LongLink home" className="inline-flex items-center">
                        <Wordmark />
                    </Link>
                </BreadcrumbItem>
                {crumbs.length ? (
                    <BreadcrumbSeparator className="px-0.5 text-muted-foreground">&gt;</BreadcrumbSeparator>
                ) : null}
                {crumbs.map((crumb, index) => (
                    <Fragment key={crumb.href}>
                        {index > 0 ? (
                            <BreadcrumbSeparator className="px-0.5 text-muted-foreground">&gt;</BreadcrumbSeparator>
                        ) : null}
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
