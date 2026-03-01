import Hero from '@/components/longlink/Hero';
import { Menu, MenuContent, MenuList, MenuSection } from '@/components/ui/menu';

const settingSections = [
    'General',
    'Identity & Authentication',
    'Access Control (RBAC)',
    'Applications',
    'Database',
    'Infrastructure',
    'Storage',
    'Audit & Compliance',
    'Backups & Recovery',
    'Security',
    'Billing & Plan',
    'API & Integrations',
    'Advanced / System',
] as const;

const toMenuValue = (section: string) =>
    section
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <Menu defaultValue={toMenuValue(settingSections[0])}>
                <MenuList>
                    {settingSections.map((section) => (
                        <MenuSection
                            key={section}
                            value={toMenuValue(section)}
                            label={section}
                        />
                    ))}
                </MenuList>

                <div className="space-y-3">
                    {settingSections.map((section) => (
                        <MenuContent
                            key={section}
                            value={toMenuValue(section)}
                            className="rounded-xl border border-border bg-card p-4"
                        >
                            <Hero
                                title={section}
                                subtitle="Configuration panel"
                                icon="building-2"
                            />
                        </MenuContent>
                    ))}
                </div>
            </Menu>
        </div>
    );
}
