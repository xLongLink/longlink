import { Auth } from '@/components/Auth';
import Layout from '@/layout/Layout';
import { useTranslation } from '@/lib/i18n';
import { Activity, Boxes, Building2, Cpu, Database, HardDrive, MapPin, Users } from 'lucide-react';
import type { ReactNode } from 'react';

/** Renders the admin shell with tabbed navigation. */
export default function Admin({ children }: { children: ReactNode }) {
    const { t } = useTranslation();

    return (
        <Auth requiredRole="support">
            <Layout
                tabs={{
                    [t('admin.tabs.users')]: { href: '/admin/users', icon: Users },
                    [t('admin.tabs.applications')]: { href: '/admin/applications', icon: Boxes },
                    [t('admin.tabs.organizations')]: { href: '/admin/organizations', icon: Building2 },
                    [t('admin.tabs.locations')]: { href: '/admin/locations', icon: MapPin },
                    [t('admin.tabs.database')]: { href: '/admin/database', icon: Database },
                    [t('admin.tabs.storage')]: { href: '/admin/storage', icon: HardDrive },
                    [t('admin.tabs.compute')]: { href: '/admin/compute', icon: Cpu },
                    [t('admin.tabs.operations')]: { href: '/admin/operations', icon: Activity },
                }}
            >
                <section className="mx-auto w-full max-w-[1000px] space-y-8">{children}</section>
            </Layout>
        </Auth>
    );
}
