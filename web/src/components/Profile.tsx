import { useState } from 'react';
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
import {
    AppWindow,
    ArrowUpDown,
    BookOpen,
    Building2,
    ChevronRight,
    Database,
    ExternalLink,
    HardDrive,
    Settings2,
    Users,
    Wrench,
} from 'lucide-react';
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
                        endContent={<ArrowUpDown aria-hidden="true" size={16} />}
                        label={user.name}
                        onClick={() => {
                            setIsOpen(false);
                            void switchAccount().catch(() => {
                                showToast({ body: t('auth.switchAccountFailed'), type: 'error' });
                            });
                        }}
                        startContent={<Avatar src={user.avatar} name={user.name} size="md" />}
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
                            endContent={<ChevronRight aria-hidden="true" className="text-secondary" size={12} />}
                            href="/organizations"
                            label={t('profile.organizations')}
                            onClickCapture={closeProfile}
                            startContent={<Building2 aria-hidden="true" className="text-secondary" size={16} />}
                        />
                        <ListItem
                            endContent={<ChevronRight aria-hidden="true" className="text-secondary" size={12} />}
                            href="/settings"
                            label={t('profile.settings')}
                            onClickCapture={closeProfile}
                            startContent={<Settings2 aria-hidden="true" className="text-secondary" size={16} />}
                        />
                        <ListItem
                            endContent={<ExternalLink aria-hidden="true" className="text-secondary" size={12} />}
                            href="/docs"
                            label={t('common.documentation')}
                            onClickCapture={closeProfile}
                            rel="noopener noreferrer"
                            startContent={<BookOpen aria-hidden="true" className="text-secondary" size={16} />}
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
                                    endContent={
                                        <ChevronRight aria-hidden="true" className="text-secondary" size={12} />
                                    }
                                    href="/admin/users"
                                    label={t('profile.users')}
                                    onClickCapture={closeProfile}
                                    startContent={<Users aria-hidden="true" className="text-secondary" size={16} />}
                                />
                                <ListItem
                                    endContent={
                                        <ChevronRight aria-hidden="true" className="text-secondary" size={12} />
                                    }
                                    href="/admin/applications"
                                    label={t('profile.applications')}
                                    onClickCapture={closeProfile}
                                    startContent={<AppWindow aria-hidden="true" className="text-secondary" size={16} />}
                                />
                                <ListItem
                                    endContent={
                                        <ChevronRight aria-hidden="true" className="text-secondary" size={12} />
                                    }
                                    href="/admin/organizations"
                                    label={t('profile.organizations')}
                                    onClickCapture={closeProfile}
                                    startContent={<Building2 aria-hidden="true" className="text-secondary" size={16} />}
                                />
                                <ListItem
                                    endContent={
                                        <ChevronRight aria-hidden="true" className="text-secondary" size={12} />
                                    }
                                    href="/admin/database"
                                    label={t('profile.database')}
                                    onClickCapture={closeProfile}
                                    startContent={<Database aria-hidden="true" className="text-secondary" size={16} />}
                                />
                                <ListItem
                                    endContent={
                                        <ChevronRight aria-hidden="true" className="text-secondary" size={12} />
                                    }
                                    href="/admin/storage"
                                    label={t('profile.storage')}
                                    onClickCapture={closeProfile}
                                    startContent={<HardDrive aria-hidden="true" className="text-secondary" size={16} />}
                                />
                                <ListItem
                                    endContent={
                                        <ChevronRight aria-hidden="true" className="text-secondary" size={12} />
                                    }
                                    href="/admin/compute"
                                    label={t('profile.compute')}
                                    onClickCapture={closeProfile}
                                    startContent={<Wrench aria-hidden="true" className="text-secondary" size={16} />}
                                />
                                <ListItem
                                    endContent={
                                        <ChevronRight aria-hidden="true" className="text-secondary" size={12} />
                                    }
                                    href="/admin/operations"
                                    label={t('profile.operations')}
                                    onClickCapture={closeProfile}
                                    startContent={
                                        <ArrowUpDown aria-hidden="true" className="text-secondary" size={16} />
                                    }
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
                icon={<Avatar src={user.avatar} name={user.name} size="md" />}
                label={user.name}
                size="md"
                variant="ghost"
            />
        </Popover>
    );
}
