import General from '@/components/settings/General';
import { Menu, MenuContent, MenuList, MenuSection } from '@/components/ui/menu';



export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <Menu defaultValue="general">
                <MenuList>
                    <MenuSection value="general" label="General" />
                    <MenuSection value="authentication" label="Authentication" />
                    <MenuSection value="access-control" label="Access Control (RBAC)" />
                    <MenuSection value="applications" label="Applications" />
                    <MenuSection value="database" label="Database" />
                    <MenuSection value="storage" label="Storage" />
                    <MenuSection value="infrastructure" label="Infrastructure" />
                    <MenuSection value="audit-compliance" label="Audit & Compliance" />
                    <MenuSection value="security" label="Security" />
                    <MenuSection value="billing" label="Billing & Plan" />
                    <MenuSection value="integrations" label="Integrations" />
                </MenuList>

                <MenuContent value="general"> <General /> </MenuContent>
            </Menu>
        </div>
    );
}
