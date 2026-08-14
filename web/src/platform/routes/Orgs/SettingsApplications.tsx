import { Auth } from '@/components/Auth';
import Organization from '@/platform/Organization';

/** Protects and renders organization application settings. */
export default function OrganizationSettingsApplicationsRoute() {
    return (
        <Auth>
            <Organization settingsSection="applications" />
        </Auth>
    );
}
