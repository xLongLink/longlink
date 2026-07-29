import { AppWindow, ArrowUpDown, Building2, Database, HardDrive, Users, Wrench } from 'lucide-react';

export const ADMIN_NAVIGATION = [
    { href: '/admin/users', icon: Users, profileLabel: 'profile.users', tabLabel: 'admin.tabs.users' },
    {
        href: '/admin/applications',
        icon: AppWindow,
        profileLabel: 'profile.applications',
        tabLabel: 'admin.tabs.applications',
    },
    {
        href: '/admin/organizations',
        icon: Building2,
        profileLabel: 'profile.organizations',
        tabLabel: 'admin.tabs.organizations',
    },
    { href: '/admin/database', icon: Database, profileLabel: 'profile.database', tabLabel: 'admin.tabs.database' },
    { href: '/admin/storage', icon: HardDrive, profileLabel: 'profile.storage', tabLabel: 'admin.tabs.storage' },
    { href: '/admin/compute', icon: Wrench, profileLabel: 'profile.compute', tabLabel: 'admin.tabs.compute' },
    {
        href: '/admin/operations',
        icon: ArrowUpDown,
        profileLabel: 'profile.operations',
        tabLabel: 'admin.tabs.operations',
    },
] as const;
