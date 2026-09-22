import type { NavigationTab } from '@/platform/layouts/Platform';
import { AppWindow, ArrowUpDown, Building2, Settings2, Users, Wrench } from 'lucide-react';

export const userNavigation = [
    { href: '/user/organizations', icon: Building2, label: 'Organizations' },
    { href: '/user/settings', icon: Settings2, label: 'Settings' },
] as const satisfies readonly NavigationTab[];

export const adminNavigation = [
    { href: '/admin/users', icon: Users, label: 'Users' },
    { href: '/admin/solutions', icon: AppWindow, label: 'Solutions' },
    { href: '/admin/organizations', icon: Building2, label: 'Organizations' },
    { href: '/admin/compute', icon: Wrench, label: 'Compute' },
    { href: '/admin/operations', icon: ArrowUpDown, label: 'Operations' },
] as const satisfies readonly NavigationTab[];
