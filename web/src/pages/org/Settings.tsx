import Applications from '@/components/settings/Applications';
import Database from '@/components/settings/Database';
import General from '@/components/settings/General';
import Container from '@/components/settings/Container';
import Integrations from '@/components/settings/Integrations';
import Logging from '@/components/settings/Logging';
import Permissions from '@/components/settings/Permissions';
import Storage from '@/components/settings/Storage';
import { Menu, MenuContent, MenuList, MenuSection } from '@/ui/menu';
import {
    AppWindowIcon,
    DatabaseIcon,
    GlobeIcon,
    HardDriveIcon,
    FileTextIcon,
    UnplugIcon,
    UsersRoundIcon,
    CpuIcon,
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
                        label="Compute"
                        icon={CpuIcon}
                    />
                    <MenuSection
                        value="logging"
                        label="Logging"
                        icon={FileTextIcon}
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
                <MenuContent value="logging">
                    <Logging />
                </MenuContent>
                <MenuContent value="integrations">
                    <Integrations />
                </MenuContent>
            </Menu>
        </div>
    );
}
