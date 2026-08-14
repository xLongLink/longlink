import { Auth } from '@/components/Auth';
import Organization from '@/platform/Organization';

/** Protects and renders organization storage settings. */
export default function OrganizationSettingsStorageRoute() {
    return (
        <Auth>
            <Organization settingsSection="storage" />
        </Auth>
    );
}
