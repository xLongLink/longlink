import { useState } from 'react';
import { Icon } from '@astryxdesign/core/Icon';
import { Item } from '@astryxdesign/core/Item';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Button } from '@astryxdesign/core/Button';
import { useToast } from '@astryxdesign/core/Toast';
import { Divider } from '@astryxdesign/core/Divider';
import { Popover } from '@astryxdesign/core/Popover';
import { useTranslator } from '@astryxdesign/core/i18n';
import { List, ListItem } from '@astryxdesign/core/List';
import { IconButton } from '@astryxdesign/core/IconButton';
import { BookOpen, Building2, Database, HardDrive, Settings2, Users } from 'lucide-react';
import { useUserProfile, useUserSessionActions } from '@/hooks/use-user';

/** Renders a user profile popover with authentication and navigation actions. */
export function UserProfile() {
    const t = useTranslator();
    const { user } = useUserProfile();
    const { signOut, switchAccount } = useUserSessionActions();
    const showToast = useToast();
    const [isOpen, setIsOpen] = useState(false);

    // Hide the profile menu until a user is loaded.
    if (!user) {
        return null;
    }

    /** Closes the profile navigation after selecting an internal link. */
    function closeProfile() {
        setIsOpen(false);
    }

    return (
        <Popover
            alignment="end"
            isOpen={isOpen}
            label={user.name}
            onOpenChange={setIsOpen}
            placement="below"
            width={280}
            content={
                <Stack gap={2} width="100%">
                    <Item
                        description={user.email}
                        endContent={<Icon icon="arrowsUpDown" size="sm" />}
                        label={user.name}
                        onClick={() => {
                            setIsOpen(false);
                            void switchAccount().catch(() => {
                                showToast({ body: t('auth.switchAccountFailed'), type: 'error' });
                            });
                        }}
                        startContent={<Avatar src={user.avatar} name={user.name} size="small" />}
                    />
                    <Divider />
                    <List
                        density="compact"
                        header={
                            <Text color="secondary" type="label">
                                {t('profile.accountSection')}
                            </Text>
                        }
                    >
                        <ListItem
                            endContent={<Icon color="secondary" icon="chevronRight" size="xsm" />}
                            href="/organizations"
                            label={t('profile.organizations')}
                            onClickCapture={closeProfile}
                            startContent={<Icon color="secondary" icon={Building2} size="sm" />}
                        />
                        <ListItem
                            endContent={<Icon color="secondary" icon="chevronRight" size="xsm" />}
                            href="/settings"
                            label={t('profile.settings')}
                            onClickCapture={closeProfile}
                            startContent={<Icon color="secondary" icon={Settings2} size="sm" />}
                        />
                        <ListItem
                            endContent={<Icon color="secondary" icon="externalLink" size="xsm" />}
                            href="/docs"
                            label={t('common.documentation')}
                            onClickCapture={closeProfile}
                            rel="noopener noreferrer"
                            startContent={<Icon color="secondary" icon={BookOpen} size="sm" />}
                            target="_blank"
                        />
                    </List>
                    {user.role !== 'user' ? (
                        <>
                            <Divider />
                            <List
                                density="compact"
                                header={
                                    <Text color="secondary" type="label">
                                        {t('profile.adminSection')}
                                    </Text>
                                }
                            >
                                <ListItem
                                    endContent={<Icon color="secondary" icon="chevronRight" size="xsm" />}
                                    href="/admin/users"
                                    label={t('profile.users')}
                                    onClickCapture={closeProfile}
                                    startContent={<Icon color="secondary" icon={Users} size="sm" />}
                                />
                                <ListItem
                                    endContent={<Icon color="secondary" icon="chevronRight" size="xsm" />}
                                    href="/admin/applications"
                                    label={t('profile.applications')}
                                    onClickCapture={closeProfile}
                                    startContent={<Icon color="secondary" icon="viewColumns" size="sm" />}
                                />
                                <ListItem
                                    endContent={<Icon color="secondary" icon="chevronRight" size="xsm" />}
                                    href="/admin/organizations"
                                    label={t('profile.organizations')}
                                    onClickCapture={closeProfile}
                                    startContent={<Icon color="secondary" icon={Building2} size="sm" />}
                                />
                                <ListItem
                                    endContent={<Icon color="secondary" icon="chevronRight" size="xsm" />}
                                    href="/admin/database"
                                    label={t('profile.database')}
                                    onClickCapture={closeProfile}
                                    startContent={<Icon color="secondary" icon={Database} size="sm" />}
                                />
                                <ListItem
                                    endContent={<Icon color="secondary" icon="chevronRight" size="xsm" />}
                                    href="/admin/storage"
                                    label={t('profile.storage')}
                                    onClickCapture={closeProfile}
                                    startContent={<Icon color="secondary" icon={HardDrive} size="sm" />}
                                />
                                <ListItem
                                    endContent={<Icon color="secondary" icon="chevronRight" size="xsm" />}
                                    href="/admin/compute"
                                    label={t('profile.compute')}
                                    onClickCapture={closeProfile}
                                    startContent={<Icon color="secondary" icon="wrench" size="sm" />}
                                />
                                <ListItem
                                    endContent={<Icon color="secondary" icon="chevronRight" size="xsm" />}
                                    href="/admin/operations"
                                    label={t('profile.operations')}
                                    onClickCapture={closeProfile}
                                    startContent={<Icon color="secondary" icon="arrowsUpDown" size="sm" />}
                                />
                            </List>
                            <Divider />
                        </>
                    ) : null}
                    <Button
                        label={t('actions.signOut')}
                        onClick={() => {
                            setIsOpen(false);
                            void signOut().catch(() => {
                                showToast({ body: t('profile.signOutFailed'), type: 'error' });
                            });
                        }}
                        variant="destructive"
                    />
                </Stack>
            }
        >
            <IconButton
                icon={<Avatar src={user.avatar} name={user.name} size="small" />}
                label={user.name}
                size="md"
                variant="ghost"
            />
        </Popover>
    );
}
