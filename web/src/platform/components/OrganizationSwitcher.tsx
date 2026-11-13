import { api } from '@/lib/api';
import { useContext, useState } from 'react';
import { SidebarContext } from '@/lib/sidebar';
import { Avatar } from '@/components/ui/Avatar';
import { Popover } from '@base-ui/react/popover';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router';
import { Button } from '@/components/shadcn/button';
import { Check, ChevronsUpDown } from 'lucide-react';
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
        <Popover.Root open={isOpen} onOpenChange={setIsOpen} modal="trap-focus">
            <Popover.Trigger
                type="button"
                aria-label={name}
                className="profile-trigger"
                data-expanded={sidebar !== 'collapsed' || undefined}
            >
                <Avatar kind="organization" name={name} />
                {sidebar !== 'collapsed' && (
                    <>
                        <span className="profile-identity-text">
                            <span className="profile-name">{name}</span>
                            <span className="profile-email">Organization</span>
                        </span>
                        <ChevronsUpDown aria-hidden="true" className="text-muted-foreground" size={16} />
                    </>
                )}
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Positioner className="profile-positioner" side="bottom" align="start" sideOffset={4}>
                    <Popover.Popup className="profile-popup" aria-label="Switch organization">
                        <section className="organization-options">
                            {error ? (
                                <>
                                    <p className="profile-email" role="alert">
                                        Unable to load organizations.
                                    </p>
                                    <Button
                                        type="button"
                                        onClick={() => void refetch()}
                                        variant="view"
                                        data-size="sm"
                                        data-variant="ghost"
                                    >
                                        Retry
                                    </Button>
                                </>
                            ) : isPending ? (
                                <p className="profile-email" role="status">
                                    Loading organizations…
                                </p>
                            ) : memberships.length === 0 ? (
                                <p className="profile-email">No organizations available.</p>
                            ) : (
                                <nav className="profile-links" aria-label="Organizations">
                                    {memberships.map(({ organization: item }) => (
                                        <RouterLink
                                            className="profile-link identity-option"
                                            to={`/orgs/${item.id}`}
                                            aria-current={item.id === organization.id ? 'page' : undefined}
                                            key={item.id}
                                            onClickCapture={() => setIsOpen(false)}
                                        >
                                            <Avatar kind="organization" name={item.name} />
                                            <span className="profile-identity-text">
                                                <span className="profile-name">{item.name}</span>
                                                <span className="profile-email">Organization</span>
                                            </span>
                                            {item.id === organization.id && <Check aria-hidden="true" size={16} />}
                                        </RouterLink>
                                    ))}
                                </nav>
                            )}
                        </section>
                        <Popover.Close className="sr-only focus:not-sr-only">Close organization switcher</Popover.Close>
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}
