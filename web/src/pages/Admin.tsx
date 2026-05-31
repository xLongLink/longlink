import Layout from '@/Layout';
import { Auth } from '@/components/Auth';
import { Outlet } from 'react-router';

/** Renders the admin shell with tabbed navigation. */
export default function Admin() {
    return (
        <Auth admin>
            <Layout
                tabs={{
                    Users: '/admin/users',
                    Organizations: '/admin/organizations',
                    Locations: '/admin/locations',
                    Database: '/admin/database',
                    Storage: '/admin/storage',
                    Compute: '/admin/compute',
                }}
            >
                <section className="mx-auto w-full max-w-[1000px] space-y-8">
                    <Outlet />
                </section>
            </Layout>
        </Auth>
    );
}
