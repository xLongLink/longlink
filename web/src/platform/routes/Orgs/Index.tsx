import { Auth } from '@/components/Auth';
import Organization from '@/platform/Organization';

/** Protects and renders an organization's applications. */
export default function OrganizationIndexRoute() {
    return (
        <Auth>
            <Organization />
        </Auth>
    );
}
