import Hero from '@/components/viavai/Hero';
import { Menu, MenuContent, MenuList, MenuSection } from '@/components/ui/menu';

const settingSections = [
    'General',
    'Identity & Authentication',
    'Access Control (RBAC)',
    'Applications',
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
            <Hero
                title="Settings"
                subtitle="Organization settings"
                icon="settings"
            />

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
                            <h2 className="text-lg font-semibold">{section}</h2>
                            <p className="text-muted-foreground text-sm">
                                Configure {section.toLowerCase()} settings.
                            </p>
                        </MenuContent>
                    ))}
                </div>
            </Menu>
        </div>
    );
}
