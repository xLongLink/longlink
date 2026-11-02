import { AppWindow, ArrowUpDown, Building2, Users, Wrench } from 'lucide-react';

export const adminNavigation = [
    { href: '/admin/users', icon: Users, label: 'Users' },
    { href: '/admin/solutions', icon: AppWindow, label: 'Solutions' },
    { href: '/admin/organizations', icon: Building2, label: 'Organizations' },
    { href: '/admin/compute', icon: Wrench, label: 'Compute' },
    { href: '/admin/operations', icon: ArrowUpDown, label: 'Operations' },
];
