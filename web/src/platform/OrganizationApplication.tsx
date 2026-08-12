import { useParams } from 'react-router';
import { Auth } from '@/components/Auth';
import NotFound from '@/platform/NotFound';
import View from '@/application/runtime/View';
import { platformApiPath } from '@/lib/platform-api';
import { useOrganization } from '@/hooks/use-organization';

/** Protects and renders one proxy-backed organization application. */
export default function OrganizationApplication() {
    const { organization = '', application = '' } = useParams();
    const { organization: organizationDetails, applications, isLoading, error } = useOrganization(organization);
    const applicationAccess = applications.find((item) => item.slug === application);

    return (
        <Auth>
            {isLoading ? (
                <View isApplicationLoading pages="" />
            ) : error?.status === 404 || !organizationDetails || !applicationAccess ? (
                <NotFound />
            ) : (
                <View
                    applicationStatus={applicationAccess.status}
                    pages={platformApiPath(`/applications/${applicationAccess.id}/proxy/pages.json`)}
                />
            )}
        </Auth>
    );
}
