import { AppWindow, ArrowUpDown, Building2, Database, HardDrive, Users, Wrench } from 'lucide-react';

export const administratorTabs = [
    { href: '/admin/users', icon: Users, label: 'Users' },
    { href: '/admin/applications', icon: AppWindow, label: 'Applications' },
    { href: '/admin/organizations', icon: Building2, label: 'Organizations' },
    { href: '/admin/database', icon: Database, label: 'Database' },
    { href: '/admin/storage', icon: HardDrive, label: 'Storage' },
    { href: '/admin/compute', icon: Wrench, label: 'Compute' },
    { href: '/admin/operations', icon: ArrowUpDown, label: 'Operations' },
] as const;
