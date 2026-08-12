import { useState } from 'react';
import { Item } from '@astryxdesign/core/Item';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Popover } from '@astryxdesign/core/Popover';
import { List, ListItem } from '@astryxdesign/core/List';
import { IconButton } from '@astryxdesign/core/IconButton';
import { BookOpen, Building2, ChevronRight, ExternalLink, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSignOut, useUserProfile } from '@/hooks/use-user';
import { ADMIN_NAVIGATION } from '@/platform/admin/navigation';

/** Renders a user profile popover with authentication and navigation actions. */
export function UserProfile() {
    const { user } = useUserProfile();
    const signOut = useSignOut();
    const showToast = useToast();
    const [isOpen, setIsOpen] = useState(false);

    // Hide the profile menu until a user is loaded.
    if (!user) {
        return null;
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
                                Account
                            </Text>
                        }
                    >
                        <ListItem
                            endContent={<ChevronRight aria-hidden="true" className="text-secondary" size={12} />}
                            href="/organizations"
                            label="Organizations"
                            onClickCapture={() => setIsOpen(false)}
                            startContent={<Building2 aria-hidden="true" className="text-secondary" size={16} />}
                        />
                        <ListItem
                            endContent={<ChevronRight aria-hidden="true" className="text-secondary" size={12} />}
                            href="/settings"
                            label="Settings"
                            onClickCapture={() => setIsOpen(false)}
                            startContent={<Settings2 aria-hidden="true" className="text-secondary" size={16} />}
                        />
                        <ListItem
                            endContent={<ExternalLink aria-hidden="true" className="text-secondary" size={12} />}
                            href="/docs"
                            label="Documentation"
                            onClickCapture={() => setIsOpen(false)}
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
                                        Administration
                                    </Text>
                                }
                            >
                                {ADMIN_NAVIGATION.map(({ href, icon: Icon, label }) => (
                                    <ListItem
                                        key={href}
                                        endContent={
                                            <ChevronRight aria-hidden="true" className="text-secondary" size={12} />
                                        }
                                        href={href}
                                        label={label}
                                        onClickCapture={() => setIsOpen(false)}
                                        startContent={<Icon aria-hidden="true" className="text-secondary" size={16} />}
                                    />
                                ))}
                            </List>
                            <Divider />
                        </>
                    ) : null}
                    <Button
                        label="Sign out"
                        onClick={() => {
                            setIsOpen(false);
                            void signOut().catch(() => {
                                showToast({ body: 'Failed to sign out', type: 'error' });
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
