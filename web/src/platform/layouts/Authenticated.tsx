import { Outlet } from 'react-router';
import { Auth } from '@/components/Auth';

/** Guards all nested Platform routes behind the shared authentication UI. */
export default function AuthenticatedLayout() {
    return (
        <Auth>
            <Outlet />
        </Auth>
    );
}
