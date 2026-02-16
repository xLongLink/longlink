import Render, { type RenderNodeSchema } from '@/components/Render';
import { useData } from '@/hooks/use-data';
import * as React from 'react';
import {
    LayoutDashboard,
    Users,
    UserPlus,
    Settings,
    Shield,
    CreditCard,
} from 'lucide-react';

import { Menu, type MenuSection } from '@/components/ui/menu';

function DashboardSidebar() {
    const [active, setActive] = React.useState<string>('overview');

    const sections: MenuSection[] = [
        {
            id: 'overview',
            label: 'Overview',
            icon: LayoutDashboard,
        },
        {
            id: 'users',
            label: 'Users',
            icon: Users,
            subSections: [
                {
                    id: 'all-users',
                    label: 'All Users',
                    icon: Users,
                },
                {
                    id: 'invite-user',
                    label: 'Invite User',
                    icon: UserPlus,
                },
            ],
        },
        {
            id: 'billing',
            label: 'Billing',
            icon: CreditCard,
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: Settings,
            subSections: [
                {
                    id: 'general-settings',
                    label: 'General',
                    icon: Settings,
                },
                {
                    id: 'security-settings',
                    label: 'Security',
                    icon: Shield,
                },
            ],
        },
    ];

    return (
        <aside className="w-64">
            <Menu
                sections={sections}
                value={active}
                onValueChange={(value) => {
                    setActive(value);
                    console.log('Selected:', value);
                }}
                ariaLabel="Dashboard Navigation"
            />
        </aside>
    );
}




export default function ViaVai() {
    const { data, isLoading, error } = useData<unknown>('/sample/page');

    const samplePageData = Array.isArray(data)
        ? (data as RenderNodeSchema[])
        : [];

    if (error) {
        return <div>{error}</div>;
    }

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (data !== null && !Array.isArray(data)) {
        return <div>Unexpected response format for /sample/page</div>;
    }

    return (
        <>
            <DashboardSidebar />
            {samplePageData.map((node, index) => (
                <Render key={index} {...node} />
            ))}
        </>
    );
}
