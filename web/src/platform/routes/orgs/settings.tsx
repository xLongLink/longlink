import Usage from './usage';
import { api } from '@/lib/api';
import TabsSection from './tags';
import Invoices from './invoices';
import Registries from './registries';
import MembersSection from './members';
import InvitationsSection from './invitations';
import PaymentMethods from './payment-methods';
import { ApiBoundary } from '@/components/api';
import { Button } from '@/components/shadcn/button';
import * as permissions from '@/platform/permissions';
import SolutionManagement from './solution-management';
import { Separator } from '@/components/shadcn/separator';
import { Stack } from '@/components/longlink/layout/stack';
import { useLocation, useOutletContext } from 'react-router';
import { Avatar } from '@/components/longlink/display/avatar';
import { useConfirm } from '@/components/longlink/hooks/use-confirm';
import type { OrganizationContext } from '@/platform/layouts/organization';
import { SettingsLayout, SettingsLink } from '@/platform/layouts/settings';
import { Boxes, Building2, ChevronDown, CreditCard, Users } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/shadcn/collapsible';

const groups = [
    {
        label: 'Organization',
        icon: Building2,
        sections: [
            { id: 'general', label: 'General' },
            { id: 'private-registries', label: 'Private registries' }
        ]
    },
    {
        label: 'Billing',
        icon: CreditCard,
        sections: [
            { id: 'usage', label: 'Usage' },
            { id: 'payment-methods', label: 'Payment Methods' },
            { id: 'invoices', label: 'Invoices' }
        ]
    },
    {
        label: 'People',
        icon: Users,
        sections: [
            { id: 'members', label: 'Members' },
            { id: 'invitations', label: 'Invitations' }
        ]
    }
];

const sections = new Set(['solutions', ...groups.flatMap((group) => group.sections.map((section) => section.id))]);

/** Shares organization identity and permissions while sections own resource lifetimes. */
export default function OrganizationSettings() {
    const membership = useOutletContext<OrganizationContext>();

    const base = `/api/v1/organizations/${membership.organization.id}`;
    const location = useLocation();

    // Unknown fragments select General; inactive sections never mount their queries or drafts.
    const requested = location.hash.slice(1);
    const section = sections.has(requested) ? requested : 'general';

    // Share the layout-resolved identity and permissions without loading inactive sections.
    const canMaintain = permissions.canMaintain(membership.role);

    return (
        <Stack gap={8}>
            <title>Organization Settings | LongLink</title>
            <Stack direction="horizontal" gap={3} align="center">
                <Avatar shape="rounded" name={membership.organization.name} />
                <Stack gap={0}>
                    <h4 className="font-semibold tracking-tight text-xl" aria-level={1}>
                        {membership.organization.name}
                    </h4>
                    <span className="text-xs text-muted-foreground">Organization</span>
                </Stack>
            </Stack>
            <SettingsLayout
                navigation={
                    <>
                        {groups.map((group) => (
                            <Collapsible key={group.label} defaultOpen>
                                <CollapsibleTrigger
                                    render={<Button variant="ghost" size="sm" className="w-full justify-start" />}
                                >
                                    <group.icon aria-hidden="true" />
                                    {group.label}
                                    <ChevronDown className="ms-auto in-data-open:rotate-180" aria-hidden="true" />
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="flex flex-col gap-0.5 ps-6">
                                        {group.sections.map((item) => (
                                            <SettingsLink active={section} id={item.id} key={item.id}>
                                                {item.label}
                                            </SettingsLink>
                                        ))}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        ))}
                        <SettingsLink active={section} id="solutions">
                            <Boxes className="size-4" aria-hidden="true" />
                            Solutions
                        </SettingsLink>
                    </>
                }
            >
                <ApiBoundary key={section}>
                    {section === 'usage' ? (
                        <Usage base={base} />
                    ) : section === 'payment-methods' ? (
                        <PaymentMethods base={base} canManage={membership.role === 'owner'} />
                    ) : section === 'invoices' ? (
                        <Invoices base={base} canManage={membership.role === 'owner'} />
                    ) : section === 'private-registries' ? (
                        <Registries base={base} canMaintain={canMaintain} />
                    ) : section === 'members' ? (
                        <MembersSection base={base} role={membership.role} />
                    ) : section === 'invitations' ? (
                        <InvitationsSection base={base} role={membership.role} />
                    ) : section === 'solutions' ? (
                        <SolutionManagement membership={membership} presentation="settings" />
                    ) : (
                        <GeneralSection
                            base={base}
                            tags={membership.tags}
                            name={membership.organization.name}
                            canMaintain={canMaintain}
                            canDelete={membership.role === 'owner'}
                        />
                    )}
                </ApiBoundary>
            </SettingsLayout>
        </Stack>
    );
}

/** Shows shared navigation categories and owner-only organization deletion. */
function GeneralSection({
    base,
    tags,
    name,
    canMaintain,
    canDelete
}: {
    base: string;
    tags: OrganizationContext['tags'];
    name: string;
    canMaintain: boolean;
    canDelete: boolean;
}) {
    const confirmation = useConfirm();

    return (
        <Stack gap={4}>
            <Stack gap={0} justify="end" className="min-h-8">
                <h2 className="font-semibold tracking-tight text-3xl block [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]">
                    General
                </h2>
            </Stack>
            <Separator />
            <TabsSection base={base} tags={tags} canMaintain={canMaintain} />
            {canDelete && (
                <Stack gap={3}>
                    <Stack gap={0} className="text-red-600 dark:text-red-400">
                        <h4 aria-level={3} className="font-semibold tracking-tight text-xl text-inherit">
                            Danger zone
                        </h4>
                    </Stack>
                    <Stack
                        direction="horizontal"
                        justify="between"
                        align="center"
                        wrap="wrap"
                        gap={4}
                        padding={4}
                        className="rounded-lg border border-red-600 dark:border-red-400"
                    >
                        <Stack gap={0}>
                            <span className="font-bold">Delete this organization</span>
                            <span className="text-muted-foreground">
                                Once deleted, it will be gone forever. Please be certain.
                            </span>
                        </Stack>
                        <Button
                            variant="destructive"
                            onClick={() =>
                                confirmation.show({
                                    title: 'Delete organization',
                                    description: `Delete ${name}? Once deleted, it will be gone forever. Please be certain.`,
                                    actionLabel: 'Delete',
                                    actionVariant: 'destructive',
                                    onAction: async () => {
                                        await api.delete(base);
                                        window.location.assign('/user/organizations');
                                    }
                                })
                            }
                        >
                            Delete
                        </Button>
                    </Stack>
                </Stack>
            )}
            {confirmation.element}
        </Stack>
    );
}
