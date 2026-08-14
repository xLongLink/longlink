import { useParams } from 'react-router';
import NotFound from '@/platform/NotFound';
import Organization from '@/platform/Organization';

/** Renders one validated organization settings section. */
export default function OrganizationSettingsRoute() {
    const { settingsSection = 'organization' } = useParams();

    if (
        settingsSection !== 'organization' &&
        settingsSection !== 'applications' &&
        settingsSection !== 'people' &&
        settingsSection !== 'database' &&
        settingsSection !== 'storage'
    ) {
        return <NotFound />;
    }

    return <Organization settingsSection={settingsSection} />;
}
