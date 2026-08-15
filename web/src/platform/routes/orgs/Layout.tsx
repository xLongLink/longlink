import { Outlet } from 'react-router';
import { Auth } from '@/components/Auth';

/** Protects organization routes before rendering their active child. */
export default function OrganizationLayoutRoute() {
    return (
        <Auth>
            <Outlet />
        </Auth>
    );
}
