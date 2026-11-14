import { cn } from 'cn';
import { api } from '@/lib/api';
import { useContext, useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { SidebarContext } from '@/lib/sidebar';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router';
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { Button, buttonVariants } from '@/components/shadcn/button';
import { GeneratedAvatar } from '@/components/custom/generated-avatar';
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
    const sidebar = useContext(SidebarContext);
    const [isOpen, setIsOpen] = useState(false);

    // Fetch memberships only when the switcher opens, without suspending the page header.
    const {
        data: memberships,
        error,
        isPending,
        refetch
    } = useQuery({
        queryKey: ['api', '/api/v1/me/organizations'],
        queryFn: ({ signal }) => api('/api/v1/me/organizations', { signal }).json(zUserOrganizationMembership.array()),
        enabled: isOpen,
        retry: false
    });

    const name =
        organization.name ??
        memberships?.find((item) => item.organization.id === organization.id)?.organization.name ??
        'Organization';

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger
                type="button"
                render={
                    <ButtonPrimitive
                        className={cn(
                            buttonVariants({ variant: 'ghost', size: null }),
                            'border-0',
                            sidebar !== 'collapsed'
                                ? 'w-full min-w-0 justify-start gap-2 p-2 text-start'
                                : 'size-10 p-1'
                        )}
                    />
                }
                aria-label={name}
            >
                <GeneratedAvatar kind="organization" name={name} />
                {sidebar !== 'collapsed' && (
                    <>
                        <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm leading-4">{name}</span>
                            <span className="truncate text-xs leading-4 text-muted-foreground">Organization</span>
                        </span>
                        <ChevronsUpDown aria-hidden="true" className="text-muted-foreground" size={16} />
                    </>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
                side="bottom"
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
                                    onClickCapture={() => setIsOpen(false)}
                                >
                                    <GeneratedAvatar kind="organization" size="sm" name={item.name} />
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
