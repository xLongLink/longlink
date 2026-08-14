import { Auth } from '@/components/Auth';
import Organization from '@/platform/Organization';

/** Protects and renders organization settings. */
export default function OrganizationSettingsRoute() {
    return (
        <Auth>
            <Organization settingsSection="organization" />
        </Auth>
    );
}
