import { api } from '@/lib/api';
import { useContext, useState } from 'react';
import { Item } from '@astryxdesign/core/Item';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Stack } from '@astryxdesign/core/Stack';
import { adminNavigation } from '@/platform/admin';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Popover } from '@astryxdesign/core/Popover';
import { clearAppearanceCache } from '@/lib/appearance';
import { List, ListItem } from '@astryxdesign/core/List';
import { IconButton } from '@astryxdesign/core/IconButton';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { SidebarContext } from '@/components/layouts/Platform';
import { BookOpen, Building2, ChevronsUpDown, ExternalLink, Settings2 } from 'lucide-react';

/** Renders a user profile popover with authentication and navigation actions. */
export function ProfileMenu() {
    const user = useAuthenticatedUser();
    const sidebar = useContext(SidebarContext);
    const isSidebar = sidebar !== null;
    const [isOpen, setIsOpen] = useState(false);
    const closeMenu = () => setIsOpen(false);

    return (
        <Popover
            alignment={isSidebar ? 'start' : 'end'}
            className={isSidebar ? 'w-full' : undefined}
            isOpen={isOpen}
            label={user.name}
            onOpenChange={setIsOpen}
            placement={isSidebar ? 'above' : 'below'}
            width={280}
            content={
                <Stack gap={2} width="100%">
                    <Item
                        description={user.email}
                        label={user.name}
                        startContent={<Avatar src={user.avatar} name={user.name} seed={user.id} />}
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
                            href="/user/organizations"
                            label="Organizations"
                            onClickCapture={closeMenu}
                            startContent={<Building2 aria-hidden="true" className="text-secondary" size={16} />}
                        />
                        <ListItem
                            href="/user/settings"
                            label="Settings"
                            onClickCapture={closeMenu}
                            startContent={<Settings2 aria-hidden="true" className="text-secondary" size={16} />}
                        />
                        <ListItem
                            endContent={<ExternalLink aria-hidden="true" className="text-secondary" size={12} />}
                            href="/docs/"
                            label="Documentation"
                            onClickCapture={closeMenu}
                            startContent={<BookOpen aria-hidden="true" className="text-secondary" size={16} />}
                            target="_blank"
                        />
                    </List>
                    {user.administrator ? (
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
                                {adminNavigation.map(({ href, icon: Icon, label }) => (
                                    <ListItem
                                        key={href}
                                        href={href}
                                        label={label}
                                        onClickCapture={closeMenu}
                                        startContent={<Icon aria-hidden="true" className="text-secondary" size={16} />}
                                    />
                                ))}
                            </List>
                            <Divider />
                        </>
                    ) : null}
                    <Button
                        label="Sign out"
                        clickAction={async () => {
                            closeMenu();

                            // A full navigation disposes the authenticated cache only after logout succeeds.
                            await api('/api/v1/auth/logout', { method: 'POST' });
                            clearAppearanceCache();
                            window.location.assign('/user/organizations');
                        }}
                        variant="destructive"
                    />
                </Stack>
            }
        >
            {sidebar === 'expanded' ? (
                (trigger) => (
                    <Item
                        {...trigger}
                        as="button"
                        role="button"
                        className="w-full rounded-lg px-2 py-1.5 text-left"
                        description={user.email}
                        descriptionLines={1}
                        endContent={<ChevronsUpDown aria-hidden="true" className="text-secondary" size={16} />}
                        label={user.name}
                        labelLines={1}
                        startContent={<Avatar src={user.avatar} name={user.name} seed={user.id} />}
                    />
                )
            ) : (
                <IconButton
                    icon={<Avatar src={user.avatar} name={user.name} seed={user.id} />}
                    label={user.name}
                    variant="ghost"
                />
            )}
        </Popover>
    );
}
