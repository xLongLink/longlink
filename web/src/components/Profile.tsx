import { Avatar } from '@astryxdesign/core/Avatar';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { useTranslator } from '@astryxdesign/core/i18n';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Item } from '@astryxdesign/core/Item';
import { List, ListItem } from '@astryxdesign/core/List';
import { Popover } from '@astryxdesign/core/Popover';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { BookOpen, Building2, ChevronRight, ExternalLink, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile, useUserSessionActions } from '@/hooks/use-user';
import { ADMIN_NAVIGATION } from '@/platform/admin/navigation';

/** Renders a user profile popover with authentication and navigation actions. */
export function UserProfile() {
    const t = useTranslator();
    const { user } = useUserProfile();
    const { signOut } = useUserSessionActions();
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
                        label={user.name}
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
                    {user.role === 'administrator' ? (
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
                                {ADMIN_NAVIGATION.map(({ href, icon: Icon, profileLabel }) => (
                                    <ListItem
                                        key={href}
                                        endContent={
                                            <ChevronRight aria-hidden="true" className="text-secondary" size={12} />
                                        }
                                        href={href}
                                        label={t(profileLabel)}
                                        onClickCapture={closeProfile}
                                        startContent={<Icon aria-hidden="true" className="text-secondary" size={16} />}
                                    />
                                ))}
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
