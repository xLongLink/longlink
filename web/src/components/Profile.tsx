import type { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import { Item } from '@astryxdesign/core/Item';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { useMutation } from '@tanstack/react-query';
import { Divider } from '@astryxdesign/core/Divider';
import { Popover } from '@astryxdesign/core/Popover';
import { List, ListItem } from '@astryxdesign/core/List';
import { IconButton } from '@astryxdesign/core/IconButton';
import { BookOpen, ChevronRight, ExternalLink } from 'lucide-react';
import { zUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';
import { adminNavigation, userNavigation } from '@/platform/navigation';

/** Renders a user profile popover with authentication and navigation actions. */
export function ProfileMenu({ user }: { user: z.output<typeof zUserSummary> }) {
    const signOut = useMutation({
        mutationFn: () => api('/api/v1/auth/logout', { method: 'POST' }),
        onSuccess: () => {
            // A full navigation disposes the query cache without exposing a transient unauthenticated render.
            window.location.assign('/user/organizations');
        },
    });
    const [isOpen, setIsOpen] = useState(false);
    const closeMenu = () => setIsOpen(false);
    return (
        <Popover
            alignment="end"
            isOpen={isOpen}
            label={user.name}
            onOpenChange={setIsOpen}
            width={280}
            content={
                <Stack gap={2} width="100%">
                    <Item
                        description={user.email}
                        label={user.name}
                        startContent={<Avatar src={user.avatar} name={user.name} />}
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
                        {userNavigation.map((item) => {
                            const Icon = item.icon;

                            return (
                                <ListItem
                                    endContent={
                                        <ChevronRight aria-hidden="true" className="text-secondary" size={12} />
                                    }
                                    href={item.href}
                                    key={item.href}
                                    label={item.label}
                                    onClickCapture={closeMenu}
                                    startContent={<Icon aria-hidden="true" className="text-secondary" size={16} />}
                                />
                            );
                        })}
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
                                {adminNavigation.map((item) => {
                                    const Icon = item.icon;

                                    return (
                                        <ListItem
                                            href={item.href}
                                            key={item.href}
                                            label={item.label}
                                            onClickCapture={closeMenu}
                                            startContent={
                                                <Icon aria-hidden="true" className="text-secondary" size={16} />
                                            }
                                        />
                                    );
                                })}
                            </List>
                            <Divider />
                        </>
                    ) : null}
                    <Button
                        label="Sign out"
                        onClick={() => {
                            closeMenu();
                            signOut.mutate();
                        }}
                        variant="destructive"
                    />
                </Stack>
            }
        >
            <IconButton icon={<Avatar src={user.avatar} name={user.name} />} label={user.name} variant="ghost" />
        </Popover>
    );
}
