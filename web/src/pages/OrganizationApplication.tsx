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
        applications,
        role: organizationRole,
        isLoading,
        error,
    } = useOrganization(organization);
    const { language } = useUserProfile();
    const applicationAccess = applications.find((item) => item.application.slug === application);
    const applicationRole = applicationAccess?.role ?? null;
    const hasApplicationAccess = applicationRole !== null || hasMinimumRole(organizationRole, 'maintain');

    // Show the shell while organization/application access is still resolving.
    if (isLoading) {
        return <View applicationStatus="loading" pages="" />;
    }

    // Hide unknown org/app combinations behind the shared 404 page.
    if (error?.status === 404 || !organizationDetails || !applicationAccess || !hasApplicationAccess) {
        return <NotFound />;
    }

    return (
        <View
            applicationStatus={applicationAccess.application.status}
            locale={language}
            pages={`/api/applications/${applicationAccess.application.id}/proxy/pages.json`}
        />
    );
}
