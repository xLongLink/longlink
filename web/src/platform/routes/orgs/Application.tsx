import { useParams } from 'react-router';
import { Auth } from '@/components/Auth';
import NotFound from '@/platform/NotFound';
import View from '@/application/runtime/View';
import { platformApiPath } from '@/lib/platform-api';
import { useOrganization } from '@/hooks/use-organization';

/** Renders one proxy-backed organization application. */
function OrganizationApplicationContent() {
    const { organization = '', application = '' } = useParams();
    const { applications, isLoading, error } = useOrganization(organization);
    const applicationAccess = applications.find((item) => item.slug === application);

    if (isLoading) {
        return <View isApplicationLoading pages={null} />;
    }

    if (error?.status === 404 || !applicationAccess) {
        return <NotFound />;
    }

    return <View applicationStatus={applicationAccess.status} pages={platformApiPath(`/applications/${applicationAccess.id}/proxy/pages.json`)} />;
}

/** Protects one proxy-backed organization application. */
export default function OrganizationApplication() {
    return (
        <Auth>
            <OrganizationApplicationContent />
        </Auth>
    );
}
