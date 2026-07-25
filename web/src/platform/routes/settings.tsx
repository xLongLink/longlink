import Settings from '@/pages/Settings';
import { Auth } from '@/components/Auth';

/** Protects the current-user settings page. */
export default function SettingsRoute() {
    return (
        <Auth>
            <Settings />
        </Auth>
    );
}
