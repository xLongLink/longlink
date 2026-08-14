import { useParams } from 'react-router';
import NotFound from '@/platform/NotFound';
import View from '@/application/runtime/View';
import { platformApiPath } from '@/lib/platform-api';
import { useOrganization } from '@/hooks/use-organization';

/** Renders one proxy-backed organization application. */
export default function OrganizationApplication() {
    const { organization = '', application = '' } = useParams();
    const { organization: organizationDetails, applications, isLoading, error } = useOrganization(organization);
    const applicationAccess = applications.find((item) => item.slug === application);

    if (isLoading) {
        return <View isApplicationLoading pages="" />;
    }

    if (error?.status === 404 || !organizationDetails || !applicationAccess) {
        return <NotFound />;
    }

    return (
        <View
            applicationStatus={applicationAccess.status}
            pages={platformApiPath(`/applications/${applicationAccess.id}/proxy/pages.json`)}
        />
    );
}
