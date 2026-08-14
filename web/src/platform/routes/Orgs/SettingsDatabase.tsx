import { Auth } from '@/components/Auth';
import Organization from '@/platform/Organization';

/** Protects and renders organization database settings. */
export default function OrganizationSettingsDatabaseRoute() {
    return (
        <Auth>
            <Organization settingsSection="database" />
        </Auth>
    );
}
