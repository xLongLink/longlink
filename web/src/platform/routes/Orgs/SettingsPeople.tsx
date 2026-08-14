import { Auth } from '@/components/Auth';
import Organization from '@/platform/Organization';

/** Protects and renders organization people settings. */
export default function OrganizationSettingsPeopleRoute() {
    return (
        <Auth>
            <Organization settingsSection="people" />
        </Auth>
    );
}
