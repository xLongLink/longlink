import {
    Breadcrumb as UIBreadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
    formatAppName,
    getActiveTabConfig,
    getTabsConfig,
} from '@/lib/navigation';
import { Link, useLocation, useParams } from 'react-router';

export function Breadcrumb() {
    const { app } = useParams();
    const location = useLocation();
    const isAccountView =
        location.pathname.startsWith('/profile') ||
        location.pathname.startsWith('/viavai');
    const section = isAccountView ? 'account' : 'organization';
    const { tabs, basePathSuffix } = getTabsConfig({ section, app });

    const appName = app ? formatAppName(app) : undefined;
    const normalizedSuffix = basePathSuffix?.replace(/^\/+|\/+$/g, '') ?? '';
    const basePath = app
        ? normalizedSuffix
            ? `/${normalizedSuffix}`
            : '/'
        : isAccountView
          ? ''
          : '/';
    const accountRootPath = '/';
    const activeTabConfig = getActiveTabConfig({
        tabs,
        locationPath: location.pathname,
        basePath,
    });
    const accountBreadcrumbLabel = activeTabConfig?.label ?? 'Profile';
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
                                        to="/"
                                        className="text-sm font-semibold text-white/70"
                                    >
                                        Organization
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
                                                to={`/apps/${app}`}
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
