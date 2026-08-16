import { Outlet } from 'react-router';
import { Auth } from '@/components/Auth';
import { UserProvider } from '@/lib/hooks/use-user';

/** Guards all nested Platform routes behind the shared authentication UI. */
export default function AuthenticatedLayout() {
    return (
        <UserProvider>
            <Auth>
                <Outlet />
            </Auth>
        </UserProvider>
    );
}
