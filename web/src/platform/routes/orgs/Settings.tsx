import { useParams } from 'react-router';
import { NoIndex } from '@/components/Seo';
import SettingsPage from '@/platform/views/orgs/settings.jsx';

/** Renders the native organization settings page. */
export default function OrganizationSettings() {
    const { organization = '' } = useParams();

    return (
        <>
            <NoIndex title="Organization Settings | LongLink" />
            <SettingsPage key={organization} organization={organization} />
        </>
    );
}
