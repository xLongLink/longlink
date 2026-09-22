import type { NavigationTab } from '@/platform/layouts/Platform';
import { AppWindow, ArrowUpDown, Building2, Settings2, Users, Wrench } from 'lucide-react';

export const userNavigation = [
    { href: '/user/organizations', icon: Building2, label: 'Organizations' },
    { href: '/user/settings', icon: Settings2, label: 'Settings' },
] as const satisfies readonly NavigationTab[];

export const adminPages = [
    { id: 'admin-users', path: 'users', icon: Users, label: 'Users' },
    { id: 'admin-solutions', path: 'solutions', icon: AppWindow, label: 'Solutions' },
    { id: 'admin-organizations', path: 'organizations', icon: Building2, label: 'Organizations' },
    { id: 'admin-compute', path: 'compute', icon: Wrench, label: 'Compute' },
    { id: 'admin-operations', path: 'operations', icon: ArrowUpDown, label: 'Operations' },
] as const;

export type AdminPageId = (typeof adminPages)[number]['id'];

export const adminNavigation = adminPages.map(({ icon, label, path }) => ({
    href: `/admin/${path}`,
    icon,
    label,
})) satisfies readonly NavigationTab[];
