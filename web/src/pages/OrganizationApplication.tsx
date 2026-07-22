import { useParams } from 'react-router';
import View from '@/pages/View';
import NotFound from '@/pages/NotFound';
import { Auth } from '@/components/Auth';
import { hasMinimumRole } from '@/lib/roles';
import { useUserProfile } from '@/hooks/use-user';
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
    const {
        organization: organizationDetails,
        role: organizationRole,
        isLoading,
        error,
    } = useOrganization(organization);
    const { language } = useUserProfile();
    const organizationApplication = organizationDetails?.applications.find((item) => item.slug === application);
    const applicationRole = organizationApplication?.role ?? null;
    const hasApplicationAccess = applicationRole !== null || hasMinimumRole(organizationRole, 'maintain');

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
