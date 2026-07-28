import { useParams } from 'react-router';
import View from '@/application/runtime/View';
import { Auth } from '@/components/Auth';
import { useOrganization } from '@/hooks/use-organization';
import NotFound from '@/platform/NotFound';

/** Protects and renders one proxy-backed organization application. */
export default function OrganizationApplication() {
    return (
        <Auth>
            <OrganizationApplicationView />
        </Auth>
    );
}

/** Resolves an organization application slug to its proxy-backed XML view. */
function OrganizationApplicationView() {
    const { organization = '', application = '' } = useParams();
    const { organization: organizationDetails, applications, isLoading, error } = useOrganization(organization);
    const applicationAccess = applications.find((item) => item.application.slug === application);

    // Show the shell while organization/application access is still resolving.
    if (isLoading) {
        return <View isApplicationLoading pages="" />;
    }

    // Hide unknown org/app combinations behind the shared 404 page.
    if (error?.status === 404 || !organizationDetails || !applicationAccess) {
        return <NotFound />;
    }

    return (
        <View
            applicationStatus={applicationAccess.application.status}
            pages={`/api/applications/${applicationAccess.application.id}/proxy/pages.json`}
        />
    );
}
