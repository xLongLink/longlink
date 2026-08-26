import { useState } from 'react';
import { Item } from '@astryxdesign/core/Item';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@/lib/hooks/use-toast';
import { Stack } from '@astryxdesign/core/Stack';
import { useSignOut } from '@/lib/hooks/use-user';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Popover } from '@astryxdesign/core/Popover';
import { List, ListItem } from '@astryxdesign/core/List';
import { IconButton } from '@astryxdesign/core/IconButton';
import type { UserSummary } from '@/lib/generated/platform-api-v1/types.gen';
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

/** Renders a user profile popover with authentication and navigation actions. */
export function ProfileMenu({ user }: { user: UserSummary }) {
    const signOut = useSignOut();
    const showToast = useToast();
    const [isOpen, setIsOpen] = useState(false);
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
                            href="/user/organizations"
                            label="Organizations"
                            onClickCapture={() => setIsOpen(false)}
                            startContent={<Building2 aria-hidden="true" className="text-secondary" size={16} />}
                        />
                        <ListItem
                            endContent={<ChevronRight aria-hidden="true" className="text-secondary" size={12} />}
                            href="/user/settings"
                            label="Settings"
                            onClickCapture={() => setIsOpen(false)}
                            startContent={<Settings2 aria-hidden="true" className="text-secondary" size={16} />}
                        />
                        <ListItem
                            endContent={<ExternalLink aria-hidden="true" className="text-secondary" size={12} />}
                            href="/docs"
                            label="Documentation"
                            onClickCapture={() => setIsOpen(false)}
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
                                <ListItem
                                    href="/admin/users"
                                    label="Users"
                                    onClickCapture={() => setIsOpen(false)}
                                    startContent={<Users aria-hidden="true" className="text-secondary" size={16} />}
                                />
                                <ListItem
                                    href="/admin/applications"
                                    label="Applications"
                                    onClickCapture={() => setIsOpen(false)}
                                    startContent={<AppWindow aria-hidden="true" className="text-secondary" size={16} />}
                                />
                                <ListItem
                                    href="/admin/organizations"
                                    label="Organizations"
                                    onClickCapture={() => setIsOpen(false)}
                                    startContent={<Building2 aria-hidden="true" className="text-secondary" size={16} />}
                                />
                                <ListItem
                                    href="/admin/database"
                                    label="Database"
                                    onClickCapture={() => setIsOpen(false)}
                                    startContent={<Database aria-hidden="true" className="text-secondary" size={16} />}
                                />
                                <ListItem
                                    href="/admin/storage"
                                    label="Storage"
                                    onClickCapture={() => setIsOpen(false)}
                                    startContent={<HardDrive aria-hidden="true" className="text-secondary" size={16} />}
                                />
                                <ListItem
                                    href="/admin/compute"
                                    label="Compute"
                                    onClickCapture={() => setIsOpen(false)}
                                    startContent={<Wrench aria-hidden="true" className="text-secondary" size={16} />}
                                />
                                <ListItem
                                    href="/admin/operations"
                                    label="Operations"
                                    onClickCapture={() => setIsOpen(false)}
                                    startContent={
                                        <ArrowUpDown aria-hidden="true" className="text-secondary" size={16} />
                                    }
                                />
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
