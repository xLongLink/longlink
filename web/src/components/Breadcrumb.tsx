import {
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
    Breadcrumb as UIBreadcrumb,
} from '@ui/breadcrumb';
import startCase from 'lodash/startCase';
import { Link, useParams } from 'react-router';
/**
 * Render the top navigation breadcrumb for organization, app, and profile routes.
 */
export function Breadcrumb() {
    const { org, app } = useParams();

    const organizationName = org ? startCase(org) : 'Organization';
    const appName = app ? startCase(app) : undefined;

    return (
        <UIBreadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem>
                    <Link to="/" aria-label="LongLink home" className="inline-flex items-center">
                        <img src="/favicon.ico" alt="LongLink favicon" className="size-8" />
                    </Link>
                </BreadcrumbItem>
                <BreadcrumbItem>
                    <BreadcrumbLink
                        render={(props) => (
                            <Link {...props} to="/" className="text-sm font-semibold text-white/70">
                                {organizationName}
                            </Link>
                        )}
                    />
                </BreadcrumbItem>
                {appName && org && app ? (
                    <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink
                                render={(props) => (
                                    <Link
                                        {...props}
                                        to={`/${org}/${app}`}
                                        className="text-sm font-semibold text-white/70"
                                    >
                                        {appName}
                                    </Link>
                                )}
                            />
                        </BreadcrumbItem>
                    </>
                ) : null}
            </BreadcrumbList>
        </UIBreadcrumb>
    );
}
