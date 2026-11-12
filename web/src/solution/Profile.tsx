import { SidebarContext } from '@/lib/sidebar';
import { Item } from '@/components/astryx/Item';
import { Text } from '@/components/astryx/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Stack } from '@/components/astryx/Stack';
import { Divider } from '@/components/ui/Divider';
import { Popover } from '@/components/astryx/Popover';
import { List, ListItem } from '@/components/astryx/List';
import { IconButton } from '@/components/astryx/IconButton';
import { useContext, useLayoutEffect, useState } from 'react';
import { BookOpen, ChevronsUpDown, ExternalLink } from 'lucide-react';
import { developmentUsers, getDevelopmentUser, setDevelopmentUser } from '@/solution/development';

/** Switches local request identity without exposing production account controls. */
export function DevelopmentProfile() {
    const sidebar = useContext(SidebarContext);
    const [isOpen, setIsOpen] = useState(false);
    const [profile] = useState(getDevelopmentUser);
    const { user } = profile;

    // Install the initial persona before the isolated View can make business requests.
    useLayoutEffect(() => {
        setDevelopmentUser(profile);
    }, [profile]);

    return (
        <Popover
            alignment={sidebar !== null ? 'start' : 'end'}
            className={sidebar !== null ? 'w-full' : undefined}
            isOpen={isOpen}
            label="Development user"
            onOpenChange={setIsOpen}
            placement={sidebar !== null ? 'above' : 'below'}
            width={280}
            content={
                <Stack gap={2} width="100%">
                    <Text color="secondary" type="label">
                        Development users
                    </Text>
                    <List density="compact">
                        {developmentUsers.map((candidate) => (
                            <ListItem
                                key={candidate.user.id}
                                description={candidate.user.email}
                                isSelected={candidate.role === profile.role}
                                label={candidate.user.name}
                                startContent={<Avatar name={candidate.user.name} seed={candidate.user.id} />}
                                onClick={() => {
                                    setDevelopmentUser(candidate);

                                    // Dispose the old View, requests, and cached data together.
                                    window.location.reload();
                                }}
                            />
                        ))}
                    </List>
                    <Divider />
                    <List density="compact">
                        <ListItem
                            endContent={<ExternalLink aria-hidden="true" className="text-muted-foreground" size={12} />}
                            href="https://www.longlink.dev/docs/"
                            label="Documentation"
                            onClickCapture={() => setIsOpen(false)}
                            startContent={<BookOpen aria-hidden="true" className="text-muted-foreground" size={16} />}
                            target="_blank"
                        />
                    </List>
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
                        endContent={<ChevronsUpDown aria-hidden="true" className="text-muted-foreground" size={16} />}
                        label={user.name}
                        labelLines={1}
                        startContent={<Avatar name={user.name} seed={user.id} />}
                    />
                )
            ) : (
                <IconButton icon={<Avatar name={user.name} seed={user.id} />} label={user.name} variant="ghost" />
            )}
        </Popover>
    );
}
