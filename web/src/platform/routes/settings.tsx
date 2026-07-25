import { Auth } from '@/components/Auth';
import Settings from '@/platform/Settings';

/** Protects the current-user settings page. */
export default function SettingsRoute() {
    return (
        <Auth>
            <Settings />
        </Auth>
    );
}
