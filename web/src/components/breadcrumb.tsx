import {
    Breadcrumb as UIBreadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
    formatAppName,
    formatOrganizationName,
    getActiveTabConfig,
    getTabsConfig,
} from '@/lib/navigation';
import { Link, useLocation, useParams } from 'react-router';

export function Breadcrumb() {
    const { country = '', org = '', app } = useParams();
    const location = useLocation();
    const { tabs, basePathSuffix } = getTabsConfig({ org, app });

    const organizationName = formatOrganizationName(org || 'org');
    const appName = app ? formatAppName(app) : undefined;
    const normalizedSuffix = basePathSuffix?.replace(/^\/+|\/+$/g, '') ?? '';
    const basePath = org
        ? normalizedSuffix
            ? `/${country}/${org}/${normalizedSuffix}`
            : `/${country}/${org}`
        : '';
    const isAccountView = !org;
    const accountRootPath = '/organizations';
    const activeTabConfig = getActiveTabConfig({
        tabs,
        locationPath: location.pathname,
        basePath,
    });
    const accountBreadcrumbLabel = activeTabConfig?.label ?? 'Organizations';
    const accountBreadcrumbPath = `/${activeTabConfig?.path ?? ''}`.replace(
        /\/$/,
        ''
    );

    return (
        <UIBreadcrumb>
            <BreadcrumbList>
                {isAccountView ? (
                    <>
                        <BreadcrumbItem>
                            <BreadcrumbLink
                                render={(props) => (
                                    <Link
                                        {...props}
                                        to={accountRootPath}
                                        className="text-sm font-semibold text-white/70"
                                    >
                                        User
                                    </Link>
                                )}
                            />
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink
                                render={(props) => (
                                    <Link
                                        {...props}
                                        to={
                                            accountBreadcrumbPath ||
                                            accountRootPath
                                        }
                                        className="text-sm font-semibold text-white/70"
                                    >
                                        {accountBreadcrumbLabel}
                                    </Link>
                                )}
                            />
                        </BreadcrumbItem>
                    </>
                ) : (
                    <>
                        <BreadcrumbItem>
                            <BreadcrumbLink
                                render={(props) => (
                                    <Link
                                        {...props}
                                        to={org ? `/${country}/${org}` : '/'}
                                        className="text-sm font-semibold text-white/70"
                                    >
                                        {organizationName}
                                    </Link>
                                )}
                            />
                        </BreadcrumbItem>
                        {appName ? (
                            <>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbLink
                                        render={(props) => (
                                            <Link
                                                {...props}
                                                to={`/${country}/${org}/apps/${app}`}
                                                className="text-sm font-semibold text-white/70"
                                            >
                                                {appName}
                                            </Link>
                                        )}
                                    />
                                </BreadcrumbItem>
                            </>
                        ) : null}
                    </>
                )}
            </BreadcrumbList>
        </UIBreadcrumb>
    );
}
