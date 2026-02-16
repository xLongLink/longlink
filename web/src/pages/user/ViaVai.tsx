import Render, { type RenderNodeSchema } from '@/components/Render';
import { useData } from '@/hooks/use-data';
import * as React from 'react';
import { CreditCard, LayoutDashboard, Settings, Users } from 'lucide-react';

import {
    Menu,
    MenuContent,
    MenuList,
    MenuSection,
    MenuSubSection,
} from '@/components/ui/menu';

function DashboardSidebar() {
    const [active, setActive] = React.useState<string>('overview');

    return (
        <Menu
            value={active}
            onValueChange={(value) => {
                setActive(value);
                console.log('Selected:', value);
            }}
            ariaLabel="Dashboard Navigation"
        >
            <aside className="w-64">
                <MenuList>
                    <MenuSection
                        value="overview"
                        label="Overview"
                        icon={LayoutDashboard}
                    />
                    <MenuSection value="users" label="Users" icon={Users}>
                        <MenuSubSection value="all-users">
                            All Users
                        </MenuSubSection>
                        <MenuSubSection value="invite-user">
                            Invite User
                        </MenuSubSection>
                    </MenuSection>
                    <MenuSection
                        value="billing"
                        label="Billing"
                        icon={CreditCard}
                    />
                    <MenuSection
                        value="settings"
                        label="Settings"
                        icon={Settings}
                    >
                        <MenuSubSection value="general-settings">
                            General
                        </MenuSubSection>
                        <MenuSubSection value="security-settings">
                            Security
                        </MenuSubSection>
                    </MenuSection>
                </MenuList>
            </aside>

            <div className="space-y-3">
                <MenuContent value="overview">
                    Make changes to your account here.
                </MenuContent>
                <MenuContent value="all-users">
                    Review and manage all organization users here.
                </MenuContent>
                <MenuContent value="invite-user">
                    Invite a new user to your organization.
                </MenuContent>
                <MenuContent value="billing">
                    Change your billing info here.
                </MenuContent>
                <MenuContent value="general-settings">
                    Update general settings for your organization.
                </MenuContent>
                <MenuContent value="security-settings">
                    Manage your organization security preferences.
                </MenuContent>
            </div>
        </Menu>
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
