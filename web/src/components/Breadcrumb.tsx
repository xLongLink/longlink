import { useApiData } from '@/hooks/use-data';
import {
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
    Breadcrumb as UIBreadcrumb,
} from '@/ui/breadcrumb';
import startCase from 'lodash/startCase';
import { Link, useParams } from 'react-router';

type MetadataResponse = {
    organization_name?: string;
};

/**
 * Render the top navigation breadcrumb for organization, app, and profile routes.
 */
export function Breadcrumb() {
    const { org, application } = useParams();
    const { data: metadata } = useApiData<MetadataResponse>('/metadata.json');
    const { data: appMetadata } = useApiData<{ name?: string }>(application ? `/apps/${application}/metadata` : null);

    const appName = application ? appMetadata?.name?.trim() || startCase(application) : undefined;
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
                {appName && org && application ? (
                    <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink
                                render={(props) => (
                                    <Link
                                        {...props}
                                        to={`/${org}/${application}`}
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
