import {
    Breadcrumb as UIBreadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
} from '@/ui/breadcrumb';
import { formatAppName } from '@/lib/navigation';
import { useApiData } from '@/hooks/use-data';
import { Link, useLocation, useParams } from 'react-router';

type SettingResponse = {
    key: string;
    value: string;
    app_id: number | null;
};

export function Breadcrumb() {
    const { app } = useParams();
    const location = useLocation();
    const { data: organizationNameData } =
        useApiData<SettingResponse>('/settings/ORG_NAME');

    const appName = app ? formatAppName(app) : undefined;
    const isProfileView = location.pathname.startsWith('/profile');
    const organizationName =
        organizationNameData?.value.trim() || 'Organization';

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
