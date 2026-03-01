import AccessControl from '@/components/settings/AccessControl';
import Applications from '@/components/settings/Applications';
import AuditCompliance from '@/components/settings/AuditCompliance';
import Authentication from '@/components/settings/Authentication';
import Billing from '@/components/settings/Billing';
import Database from '@/components/settings/Database';
import General from '@/components/settings/General';
import Infrastructure from '@/components/settings/Infrastructure';
import Integrations from '@/components/settings/Integrations';
import Security from '@/components/settings/Security';
import Storage from '@/components/settings/Storage';
import { Menu, MenuContent, MenuList, MenuSection } from '@/components/ui/menu';

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <Menu defaultValue="general">
                <MenuList>
                    <MenuSection value="general" label="General" />
                    <MenuSection
                        value="authentication"
                        label="Authentication"
                    />
                    <MenuSection
                        value="access-control"
                        label="Access Control (RBAC)"
                    />
                    <MenuSection value="applications" label="Applications" />
                    <MenuSection value="database" label="Database" />
                    <MenuSection value="storage" label="Storage" />
                    <MenuSection
                        value="infrastructure"
                        label="Infrastructure"
                    />
                    <MenuSection
                        value="audit-compliance"
                        label="Audit & Compliance"
                    />
                    <MenuSection value="security" label="Security" />
                    <MenuSection value="billing" label="Billing & Plan" />
                    <MenuSection value="integrations" label="Integrations" />
                </MenuList>
                <MenuContent value="general">
                    <General />
                </MenuContent>
                <MenuContent value="authentication">
                    <Authentication />
                </MenuContent>
                <MenuContent value="access-control">
                    <AccessControl />
                </MenuContent>
                <MenuContent value="applications">
                    <Applications />
                </MenuContent>
                <MenuContent value="database">
                    <Database />
                </MenuContent>
                <MenuContent value="storage">
                    <Storage />
                </MenuContent>
                <MenuContent value="infrastructure">
                    <Infrastructure />
                </MenuContent>
                <MenuContent value="audit-compliance">
                    <AuditCompliance />
                </MenuContent>
                <MenuContent value="security">
                    <Security />
                </MenuContent>
                <MenuContent value="billing">
                    <Billing />
                </MenuContent>
                <MenuContent value="integrations">
                    <Integrations />
                </MenuContent>
            </Menu>
        </div>
    );
}
