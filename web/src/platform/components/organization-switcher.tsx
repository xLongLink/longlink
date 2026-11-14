import { api } from '@/lib/api';
import { useContext, useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { SidebarContext } from '@/lib/sidebar';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router';
import { Button, buttonVariants } from '@/components/shadcn/button';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { GeneratedAvatar } from '@/components/custom/generated-avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover';
import { zUserOrganizationMembership } from '@/lib/generated/platform-api-v1/zod.gen';

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
        <Popover open={isOpen} onOpenChange={setIsOpen} modal="trap-focus">
            <PopoverTrigger
                type="button"
                render={
                    <Button
                        variant="ghost"
                        size={sidebar !== 'collapsed' ? 'lg' : 'icon-lg'}
                        className={sidebar !== 'collapsed' ? 'w-full min-w-0 justify-start text-start' : undefined}
                    />
                }
                aria-label={name}
            >
                <GeneratedAvatar kind="organization" name={name} size="sm" />
                {sidebar !== 'collapsed' && (
                    <>
                        <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm leading-4">{name}</span>
                            <span className="truncate text-xs leading-4 text-muted-foreground">Organization</span>
                        </span>
                        <ChevronsUpDown aria-hidden="true" className="text-muted-foreground" size={16} />
                    </>
                )}
            </PopoverTrigger>
            <PopoverContent
                side="bottom"
                align="start"
                sideOffset={4}
                className="max-h-(--available-height) max-w-(--available-width) overflow-y-auto"
                aria-label="Switch organization"
            >
                <section className="flex flex-col gap-2">
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
                        <nav className="flex flex-col gap-1" aria-label="Organizations">
                            {memberships.map(({ organization: item }) => (
                                <RouterLink
                                    className={buttonVariants({
                                        variant: 'ghost',
                                        size: 'lg',
                                        className:
                                            'w-full min-w-0 justify-start text-start font-normal aria-current:bg-muted dark:aria-current:bg-muted/50'
                                    })}
                                    to={`/orgs/${item.id}`}
                                    aria-current={item.id === organization.id ? 'page' : undefined}
                                    key={item.id}
                                    onClickCapture={() => setIsOpen(false)}
                                >
                                    <GeneratedAvatar kind="organization" name={item.name} size="sm" />
                                    <span className="flex min-w-0 flex-1 flex-col">
                                        <span className="truncate text-sm leading-4">{item.name}</span>
                                        <span className="truncate text-xs leading-4 text-muted-foreground">
                                            Organization
                                        </span>
                                    </span>
                                </RouterLink>
                            ))}
                        </nav>
                    )}
                </section>
                <PopoverPrimitive.Close
                    type="button"
                    render={<Button variant="ghost" />}
                    className="sr-only focus:not-sr-only"
                >
                    Close organization switcher
                </PopoverPrimitive.Close>
            </PopoverContent>
        </Popover>
    );
}
