import type { NavigationTab } from '@/platform/layouts/Platform';
import { AppWindow, ArrowUpDown, Building2, Settings2, Users, Wrench } from 'lucide-react';

export const userNavigation = [
    { href: '/user/organizations', icon: Building2, label: 'Organizations' },
    { href: '/user/settings', icon: Settings2, label: 'Settings' },
] as const satisfies readonly NavigationTab[];

export const adminPages = [
    { id: 'admin-users', path: 'users', module: './routes/admin/Users.tsx', icon: Users, label: 'Users' },
    {
        id: 'admin-solutions',
        path: 'solutions',
        module: './routes/admin/Solutions.tsx',
        icon: AppWindow,
        label: 'Solutions',
    },
    {
        id: 'admin-organizations',
        path: 'organizations',
        module: './routes/admin/Organizations.tsx',
        icon: Building2,
        label: 'Organizations',
    },
    { id: 'admin-compute', path: 'compute', module: './routes/admin/Compute.tsx', icon: Wrench, label: 'Compute' },
    {
        id: 'admin-operations',
        path: 'operations',
        module: './routes/admin/Operations.tsx',
        icon: ArrowUpDown,
        label: 'Operations',
    },
] as const;

export const adminNavigation = adminPages.map(({ icon, label, path }) => ({
    href: `/admin/${path}`,
    icon,
    label,
})) satisfies readonly NavigationTab[];
