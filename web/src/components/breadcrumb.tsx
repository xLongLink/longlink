import {
    Breadcrumb as UIBreadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { formatAppName } from '@/lib/navigation';
import { Link, useLocation, useParams } from 'react-router';

export function Breadcrumb() {
    const { app } = useParams();
    const location = useLocation();

    const appName = app ? formatAppName(app) : undefined;
    const isProfileView = location.pathname.startsWith('/profile');

    return (
        <UIBreadcrumb>
            <BreadcrumbList>
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
                {isProfileView ? (
                    <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink
                                render={(props) => (
                                    <Link
                                        {...props}
                                        to="/profile"
                                        className="text-sm font-semibold text-white/70"
                                    >
                                        Profile
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
