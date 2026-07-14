import { useParams } from 'react-router';
import View from '@/pages/View';
import NotFound from '@/pages/NotFound';
import { Auth } from '@/components/Auth';
import { useUserProfile } from '@/hooks/use-user';
import { canAccessApplication } from '@/lib/roles';
import { useOrganization } from '@/hooks/use-organization';

/** Protects and renders one proxy-backed organization application. */
export default function OrganizationApplication() {
    return (
        <Auth requiredRole="user">
            <OrganizationApplicationView />
        </Auth>
    );
}

/** Resolves an organization application slug to its proxy-backed XML view. */
function OrganizationApplicationView() {
    const { organization = '', application = '' } = useParams();
    const { organization: organizationDetails, isLoading, error } = useOrganization(organization);
    const { organizations: userOrganizations, language } = useUserProfile();
    const organizationApplication = organizationDetails?.applications.find((item) => item.slug === application);
    const organizationMembership = userOrganizations.find((item) => item.slug === organization);
    const organizationRole = organizationMembership?.role ?? null;
    const applicationRole = organizationApplication?.role ?? null;
    const hasApplicationAccess = canAccessApplication(organizationRole, applicationRole);

    // Show the shell while organization/application access is still resolving.
    if (isLoading) {
        return <View applicationStatus="loading" pages="" />;
    }

    // Hide unknown org/app combinations behind the shared 404 page.
    if (error?.status === 404 || !organizationDetails || !organizationApplication || !hasApplicationAccess) {
        return <NotFound />;
    }

    return (
        <View
            applicationStatus={organizationApplication.status}
            locale={language}
            pages={`/api/applications/${organizationApplication.id}/proxy/pages.json`}
        />
    );
}
