import { Code2, Settings, Users } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const settingsTabs = [
    { value: 'profile', label: 'Profile', icon: Settings, path: '' },
    {
        value: 'organizations',
        label: 'Organizations',
        icon: Users,
        path: 'organizations',
    },
    { value: 'developer', label: 'Developer', icon: Code2, path: 'developer' },
];

export default function SettingsLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const basePath = '/settings';

    const activeTab = (() => {
        const path = location.pathname;
        const matchedTab = settingsTabs.find((tab) => {
            if (tab.path === '') {
                return path === basePath || path === `${basePath}/profile`;
            }
            return path.startsWith(`${basePath}/${tab.path}`);
        });
        return matchedTab?.value ?? 'profile';
    })();

    return (
        <div className="min-h-screen bg-[#0b0e13] text-white">
            <div className="mx-auto w-full max-w-6xl space-y-8 px-6 pb-16 pt-10">
                <div className="space-y-4">
                    <div>
                        <h1 className="text-2xl font-semibold">Settings</h1>
                        <p className="text-sm text-white/50">
                            Manage your personal settings, organizations, and
                            developer tools.
                        </p>
                    </div>
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => {
                            const nextTab = settingsTabs.find(
                                (tab) => tab.value === value
                            );
                            if (!nextTab) {
                                return;
                            }
                            const nextPath = nextTab.path;
                            navigate(
                                nextPath === ''
                                    ? basePath
                                    : `${basePath}/${nextPath}`
                            );
                        }}
                    >
                        <TabsList variant="line" className="gap-4">
                            {settingsTabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <TabsTrigger
                                        key={tab.value}
                                        value={tab.value}
                                        className="cursor-pointer"
                                    >
                                        <Icon className="h-4 w-4" />
                                        {tab.label}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </Tabs>
                </div>
                <Outlet />
            </div>
        </div>
    );
}
