import { useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router';
import { apiQueryOptions } from '@/lib/react-query';
import { Button } from '@/components/longlink/action/button';
import { Avatar } from '@/components/longlink/display/avatar';
import { SidebarMenuButton } from '@/components/shadcn/sidebar';
import { zUserOrganizationMembership } from '@/lib/generated/platform-api-v1/zod.gen';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger
} from '@/components/shadcn/dropdown-menu';

export type OrganizationIdentity = { id: string; name?: string };

/** Switches Organizations from the sidebar account row. */
export function OrganizationSwitcher({ organization }: { organization: OrganizationIdentity }) {
    const [isOpen, setIsOpen] = useState(false);

    // Fetch memberships only when the switcher opens, without suspending the page header.
    const {
        data: memberships,
        error,
        isPending,
        refetch
    } = useQuery({
        ...apiQueryOptions('/api/v1/me/organizations', zUserOrganizationMembership.array()),
        enabled: isOpen,
        staleTime: 60_000
    });

    const name =
        organization.name ??
        memberships?.find((item) => item.organization.id === organization.id)?.organization.name ??
        'Organization';

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger type="button" render={<SidebarMenuButton size="lg" />} aria-label={name}>
                <Avatar shape="rounded" name={name} />
                <span className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm leading-4">{name}</span>
                    <span className="truncate text-xs leading-4 text-muted-foreground">Organization</span>
                </span>
                <ChevronsUpDown
                    aria-hidden="true"
                    className="text-muted-foreground group-data-[collapsible=icon]:hidden"
                    size={16}
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                side="top"
                align="start"
                sideOffset={4}
                className="min-w-56"
                aria-label="Switch organization"
            >
                <DropdownMenuGroup aria-label="Organizations">
                    <DropdownMenuLabel>Organizations</DropdownMenuLabel>
                    {error ? (
                        <>
                            <p className="text-xs text-muted-foreground" role="alert">
                                Unable to load organizations.
                            </p>
                            <Button type="button" onClick={() => void refetch()} variant="ghost" size="sm">
                                Retry
                            </Button>
                        </>
                    ) : isPending ? (
                        <p className="text-xs text-muted-foreground" role="status">
                            Loading organizations…
                        </p>
                    ) : memberships.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No organizations available.</p>
                    ) : (
                        <>
                            {memberships.map(({ organization: item }) => (
                                <DropdownMenuItem
                                    render={<RouterLink to={`/orgs/${item.id}`} />}
                                    aria-current={item.id === organization.id ? 'page' : undefined}
                                    key={item.id}
                                >
                                    <Avatar shape="rounded" size="sm" name={item.name} />
                                    <span className="truncate">{item.name}</span>
                                </DropdownMenuItem>
                            ))}
                        </>
                    )}
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
