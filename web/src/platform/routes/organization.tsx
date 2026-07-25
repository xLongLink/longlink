import { useLocation } from 'react-router';
import type { SettingsRouteSection } from '@/pages/org/Settings';
import { Auth } from '@/components/Auth';
import Organization from '@/pages/Organization';

const sections: Record<string, SettingsRouteSection> = {
    applications: 'applications',
    people: 'people',
    database: 'database',
    storage: 'storage',
};

/** Protects an organization route and selects its settings section from the URL. */
export default function OrganizationRoute() {
    const location = useLocation();
    const settingsPath = location.pathname.split('/settings')[1];
    const segment = settingsPath?.split('/').filter(Boolean)[0];
    const section = segment === undefined ? 'organization' : (sections[segment] ?? 'organization');

    return (
        <Auth requiredRole="user">
            <Organization settingsSection={settingsPath === undefined ? undefined : section} />
        </Auth>
    );
}
