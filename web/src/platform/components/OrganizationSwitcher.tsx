import { api } from '@/lib/api';
import { useContext, useState } from 'react';
import { SidebarContext } from '@/lib/sidebar';
import { Item } from '@astryxdesign/core/Item';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Stack } from '@astryxdesign/core/Stack';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@astryxdesign/core/Button';
import { Popover } from '@astryxdesign/core/Popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { List, ListItem } from '@astryxdesign/core/List';
import { IconButton } from '@astryxdesign/core/IconButton';
import { zUserOrganizationMembership } from '@/lib/generated/platform-api-v1/zod.gen';

export type OrganizationIdentity = {
    id: string;
    name?: string;
};

/** Switches Organizations from the sidebar account row. */
export function OrganizationSwitcher({ organization }: { organization: OrganizationIdentity }) {
    const sidebar = useContext(SidebarContext);
    const [isOpen, setIsOpen] = useState(false);

    // Fetch memberships only when the switcher opens, without suspending the page header.
    const {
        data: memberships,
        error,
        isPending,
        refetch,
    } = useQuery({
        queryKey: ['api', '/api/v1/me/organizations'],
        queryFn: ({ signal }) => api('/api/v1/me/organizations', { signal }).json(zUserOrganizationMembership.array()),
        enabled: isOpen,
        retry: false,
    });

    const name =
        organization.name ??
        memberships?.find((item) => item.organization.id === organization.id)?.organization.name ??
        'Organization';

    return (
        <Popover
            className="w-full"
            isOpen={isOpen}
            label="Switch organization"
            onOpenChange={setIsOpen}
            width={280}
            content={
                <Stack className="max-h-80 overflow-y-auto" gap={2}>
                    {error ? (
                        <>
                            <Text color="secondary">Unable to load organizations.</Text>
                            <Button label="Retry" onClick={() => void refetch()} size="sm" variant="ghost" />
                        </>
                    ) : isPending ? (
                        <Text color="secondary" role="status">
                            Loading organizations…
                        </Text>
                    ) : memberships.length === 0 ? (
                        <Text color="secondary">No organizations available.</Text>
                    ) : (
                        <List density="compact" aria-label="Organizations">
                            {memberships.map(({ organization: item }) => (
                                <ListItem
                                    description="Organization"
                                    endContent={
                                        item.id === organization.id ? <Check aria-hidden="true" size={16} /> : undefined
                                    }
                                    href={`/orgs/${item.id}`}
                                    isSelected={item.id === organization.id}
                                    key={item.id}
                                    label={item.name}
                                    onClickCapture={() => setIsOpen(false)}
                                    startContent={<Avatar kind="organization" name={item.name} />}
                                />
                            ))}
                        </List>
                    )}
                </Stack>
            }
        >
            {sidebar === 'collapsed' ? (
                <IconButton icon={<Avatar kind="organization" name={name} />} label={name} variant="ghost" />
            ) : (
                (trigger) => (
                    <Item
                        {...trigger}
                        as="button"
                        role="button"
                        className="w-full rounded-lg px-2 py-1.5 text-left"
                        description="Organization"
                        descriptionLines={1}
                        endContent={<ChevronsUpDown aria-hidden="true" className="text-secondary" size={16} />}
                        label={name}
                        labelLines={1}
                        startContent={<Avatar kind="organization" name={name} />}
                    />
                )
            )}
        </Popover>
    );
}
