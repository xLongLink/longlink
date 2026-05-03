import {
    Breadcrumb as UIBreadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
} from '@/ui/breadcrumb';
import { formatOrganizationName } from '@/lib/navigation';
import { useApiData } from '@/hooks/use-data';
import { Link, useParams } from 'react-router';

type MetadataResponse = {
    organization_name?: string;
};

/**
 * Render the top navigation breadcrumb for organization, app, and profile routes.
 */
export function Breadcrumb() {
    const { appId } = useParams();
    const { data: metadata } = useApiData<MetadataResponse>('/metadata.json');
    const { data: appMetadata } = useApiData<{ name?: string }>(appId ? `/apps/${appId}/metadata` : null);

    const appName = appId ? appMetadata?.name?.trim() || formatOrganizationName(appId) : undefined;
    const organizationName = metadata?.organization_name?.trim() || 'Organization';

    return (
        <UIBreadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem>
                    <img src="/favicon.ico" alt="LongLink favicon" className="size-8 rounded-md p-0.5" />
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
                {appName && appId ? (
                    <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink
                                render={(props) => (
                                    <Link
                                        {...props}
                                        to={`/applications/${appId}`}
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
