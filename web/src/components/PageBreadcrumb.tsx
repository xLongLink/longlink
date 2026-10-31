import { api } from '@/lib/api';
import { useState } from 'react';
import { Item } from '@astryxdesign/core/Item';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Wordmark } from '@/components/Wordmark';
import { Stack } from '@astryxdesign/core/Stack';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@astryxdesign/core/Button';
import { Popover } from '@astryxdesign/core/Popover';
import { List, ListItem } from '@astryxdesign/core/List';
import { useLocation, useOutletContext } from 'react-router';
import { formatPathSegment } from '@/components/breadcrumb/text';
import { Check, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';
import { zUserOrganizationMembership } from '@/lib/generated/platform-api-v1/zod.gen';

/** Renders the top navigation breadcrumb for organization and admin routes. */
export function PageBreadcrumb({ solutionName }: { solutionName?: string }) {
    const { pathname } = useLocation();
    const organization = pathname.split('/')[2] ?? '';
    const isOrganization = pathname.startsWith('/orgs/');
    const label = pathname.startsWith('/admin/') ? 'Admin' : formatPathSegment(organization);
    const isSolutionBreadcrumb = solutionName !== undefined;

    return (
        <Breadcrumbs separator=">" variant="supporting">
            <BreadcrumbItem href="/user/organizations">
                <Wordmark />
            </BreadcrumbItem>
            <BreadcrumbItem isCurrent={!isSolutionBreadcrumb}>
                {isOrganization ? <OrganizationSwitcher organization={organization} /> : label}
            </BreadcrumbItem>
            {isSolutionBreadcrumb && <BreadcrumbItem isCurrent>{solutionName}</BreadcrumbItem>}
        </Breadcrumbs>
    );
}

/** Switches Organizations from a compact breadcrumb or a full-width sidebar account row. */
export function OrganizationSwitcher({
    organization,
    isSidebar = false,
}: {
    organization: string;
    isSidebar?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const membership = useOutletContext<{ organization: { name: string; slug: string } } | undefined>();

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
        (membership?.organization.slug === organization ? membership.organization.name : undefined) ??
        memberships?.find((item) => item.organization.slug === organization)?.organization.name ??
        formatPathSegment(organization);

    return (
        <Popover
            className={isSidebar ? 'w-full' : undefined}
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
                                        item.slug === organization ? <Check aria-hidden="true" size={16} /> : undefined
                                    }
                                    href={`/orgs/${item.slug}`}
                                    isSelected={item.slug === organization}
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
            {isSidebar ? (
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
            ) : (
                <Button
                    endContent={<ChevronDown aria-hidden="true" size={14} />}
                    label={name}
                    size="sm"
                    variant="ghost"
                />
            )}
        </Popover>
    );
}
