import Applications from '@/components/settings/Applications';
import Authentication from '@/components/settings/Authentication';
import Database from '@/components/settings/Database';
import General from '@/components/settings/General';
import Infrastructure from '@/components/settings/Infrastructure';
import Integrations from '@/components/settings/Integrations';
import Security from '@/components/settings/Security';
import Storage from '@/components/settings/Storage';
import { Menu, MenuContent, MenuList, MenuSection } from '@/components/ui/menu';
import {
    AppWindowIcon,
    DatabaseIcon,
    GlobeIcon,
    HardDriveIcon,
    KeyRoundIcon,
    ShieldIcon,
    UnplugIcon,
    WrenchIcon,
} from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <Menu defaultValue="general">
                <MenuList>
                    <MenuSection
                        value="general"
                        label="General"
                        icon={GlobeIcon}
                    />
                    <MenuSection
                        value="authentication"
                        label="Authentication"
                        icon={KeyRoundIcon}
                    />
                    <MenuSection
                        value="applications"
                        label="Applications"
                        icon={AppWindowIcon}
                    />
                    <MenuSection
                        value="database"
                        label="Database"
                        icon={DatabaseIcon}
                    />
                    <MenuSection
                        value="storage"
                        label="Storage"
                        icon={HardDriveIcon}
                    />
                    <MenuSection
                        value="infrastructure"
                        label="Infrastructure"
                        icon={WrenchIcon}
                    />
                    <MenuSection
                        value="security"
                        label="Security"
                        icon={ShieldIcon}
                    />
                    <MenuSection
                        value="integrations"
                        label="Integrations"
                        icon={UnplugIcon}
                    />
                </MenuList>
                <MenuContent value="general">
                    <General />
                </MenuContent>
                <MenuContent value="authentication">
                    <Authentication />
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
                <MenuContent value="security">
                    <Security />
                </MenuContent>
                <MenuContent value="integrations">
                    <Integrations />
                </MenuContent>
            </Menu>
        </div>
    );
}
