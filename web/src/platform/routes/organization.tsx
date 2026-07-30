import { useMatches } from 'react-router';
import { Auth } from '@/components/Auth';
import type { SettingsRouteSection } from '@/platform/org/Settings';
import Organization from '@/platform/Organization';

const sections: Record<string, SettingsRouteSection> = {
    'organization-settings': 'organization',
    'organization-application-settings': 'applications',
    'organization-people': 'people',
    'organization-database': 'database',
    'organization-storage': 'storage',
};

/** Protects an organization route and selects its settings section from the matched route. */
export default function OrganizationRoute() {
    return (
        <Auth>
            <Organization settingsSection={sections[useMatches().at(-1)?.id ?? '']} />
        </Auth>
    );
}
