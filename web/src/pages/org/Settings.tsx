import Applications from '@/components/settings/Applications';
import Database from '@/components/settings/Database';
import General from '@/components/settings/General';
import Container from '@/components/settings/Container';
import Integrations from '@/components/settings/Integrations';
import Permissions from '@/components/settings/Permissions';
import Security from '@/components/settings/Security';
import Storage from '@/components/settings/Storage';
import { Menu, MenuContent, MenuList, MenuSection } from '@/components/ui/menu';
import {
    AppWindowIcon,
    DatabaseIcon,
    GlobeIcon,
    HardDriveIcon,
    ShieldIcon,
    UnplugIcon,
    UsersRoundIcon,
    WrenchIcon,
} from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <Menu defaultValue="general">
                <MenuList>
                    <MenuSection
                        value="general"
                        label="Organization"
                        icon={GlobeIcon}
                    />
                    <MenuSection
                        value="permissions"
                        label="Permissions"
                        icon={UsersRoundIcon}
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
                        value="container"
                        label="Container"
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
                <MenuContent value="permissions">
                    <Permissions />
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
                <MenuContent value="container">
                    <Container />
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
