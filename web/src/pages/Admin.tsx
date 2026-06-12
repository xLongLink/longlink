import Layout from '@/layout/Layout';
import { Auth } from '@/components/Auth';
import { Activity, Boxes, Building2, Cpu, Database, HardDrive, MapPin, Users } from 'lucide-react';
import { Outlet } from 'react-router';

/** Renders the admin shell with tabbed navigation. */
export default function Admin() {
    return (
        <Auth requiredRole="support">
            <Layout
                tabs={{
                    Users: { href: '/admin/users', icon: Users },
                    Applications: { href: '/admin/applications', icon: Boxes },
                    Organizations: { href: '/admin/organizations', icon: Building2 },
                    Locations: { href: '/admin/locations', icon: MapPin },
                    Database: { href: '/admin/database', icon: Database },
                    Storage: { href: '/admin/storage', icon: HardDrive },
                    Compute: { href: '/admin/compute', icon: Cpu },
                    Operations: { href: '/admin/operations', icon: Activity },
                }}
            >
                <section className="mx-auto w-full max-w-[1000px] space-y-8">
                    <Outlet />
                </section>
            </Layout>
        </Auth>
    );
}
