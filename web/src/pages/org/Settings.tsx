import { Menu, MenuSection } from '@ui/menu';
import { Boxes, Building2, Cpu, Database, HardDrive, Settings2, ShieldCheck, Plug } from 'lucide-react';

/** Renders the organization settings page body. */
export default function Settings() {
    return (
        <Menu defaultValue="organization" className="items-start">
            <MenuSection value="organization" label="Organization" icon={Building2}>
                <div className="rounded-2xl border border-border bg-card/80 p-6">
                    <h2 className="text-lg font-medium text-foreground">Organization</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Manage the workspace name, branding, and ownership.</p>
                </div>
            </MenuSection>

            <MenuSection value="permissions" label="Permissions" icon={ShieldCheck}>
                <div className="rounded-2xl border border-border bg-card/80 p-6">
                    <h2 className="text-lg font-medium text-foreground">Permissions</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Control member roles and access policies.</p>
                </div>
            </MenuSection>

            <MenuSection value="applications" label="Applications" icon={Boxes}>
                <div className="rounded-2xl border border-border bg-card/80 p-6">
                    <h2 className="text-lg font-medium text-foreground">Applications</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Review apps connected to this organization.</p>
                </div>
            </MenuSection>

            <MenuSection value="database" label="Database" icon={Database}>
                <div className="rounded-2xl border border-border bg-card/80 p-6">
                    <h2 className="text-lg font-medium text-foreground">Database</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Configure database-backed services and connections.</p>
                </div>
            </MenuSection>

            <MenuSection value="storage" label="Storage" icon={HardDrive}>
                <div className="rounded-2xl border border-border bg-card/80 p-6">
                    <h2 className="text-lg font-medium text-foreground">Storage</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Manage files, buckets, and persisted assets.</p>
                </div>
            </MenuSection>

            <MenuSection value="compute" label="Compute" icon={Cpu}>
                <div className="rounded-2xl border border-border bg-card/80 p-6">
                    <h2 className="text-lg font-medium text-foreground">Compute</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Adjust runtime and execution capacity settings.</p>
                </div>
            </MenuSection>

            <MenuSection value="logging" label="Logging" icon={Settings2}>
                <div className="rounded-2xl border border-border bg-card/80 p-6">
                    <h2 className="text-lg font-medium text-foreground">Logging</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Configure event and audit logging outputs.</p>
                </div>
            </MenuSection>

            <MenuSection value="integrations" label="Integrations" icon={Plug}>
                <div className="rounded-2xl border border-border bg-card/80 p-6">
                    <h2 className="text-lg font-medium text-foreground">Integrations</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Connect external services and workflow tools.</p>
                </div>
            </MenuSection>
        </Menu>
    );
}
