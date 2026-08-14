import { useState } from 'react';
import { useLocation } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Avatar } from '@astryxdesign/core/Avatar';
import { HStack } from '@astryxdesign/core/HStack';
import { Slider } from '@astryxdesign/core/Slider';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Selector } from '@astryxdesign/core/Selector';
import { TextInput } from '@astryxdesign/core/TextInput';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Building2, Paintbrush, Settings2, UserRound } from 'lucide-react';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import { useToast } from '@/hooks/use-toast';
import { useDeleteDialog } from '@/lib/utils';
import PlatformLayout from '@/platform/layout';
import { PageContainer } from '@/components/PageContainer';
import { useDeleteOrganization } from '@/hooks/use-organization';
import CreateOrganization from '@/components/dialogs/CreateOrganization';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { useUpdateUser, useUserOrganizations, useUserProfile } from '@/hooks/use-user';
import { ACCENT_OPTIONS, DEFAULT_RADIUS, MAX_RADIUS, MIN_RADIUS, type Accent } from '@/lib/theme';

const RADIUS_MARKS = [MIN_RADIUS, 0.5, DEFAULT_RADIUS, MAX_RADIUS].map((value) => ({
    value,
    label: formatRadius(value),
}));

function formatRadius(value: number): string {
    return value === 0 ? 'None' : `${value.toFixed(2)}x`;
}

/** Renders the authenticated settings page. */
export default function Settings() {
    const toast = useToast();
    const location = useLocation();
    const { user, accent, radius, isLoading: isProfileLoading } = useUserProfile();
    const { memberships, isLoading: areOrganizationsLoading } = useUserOrganizations();
    const { mutateAsync: updateUser, isPending } = useUpdateUser();
    const deleteOrganization = useDeleteOrganization();
    const [editedName, setEditedName] = useState<string | null>(null);
    const [editedRadius, setEditedRadius] = useState<number | null>(null);
    const [accountError, setAccountError] = useState<string | null>(null);
    const hash = location.hash.replace(/^#/, '');
    const section = hash === 'appearance' || hash === 'organizations' || hash === 'account' ? hash : 'account';
    const name = editedName ?? user?.name ?? '';
    const accountName = name.trim();
    const isLoading = isProfileLoading || areOrganizationsLoading;

    /** Displays a failed account preference update. */
    function showAccountUpdateError(error: unknown) {
        toast({
            body: error instanceof Error ? error.message : 'Failed to update account',
            type: 'error',
        });
    }

    /** Saves the edited account name when focus leaves its input. */
    const saveAccountName = async () => {
        setAccountError(null);

        // Ignore saves when the user is not available.
        if (!user) {
            return;
        }

        // Require a non-empty account name.
        if (!accountName) {
            setAccountError('Username is required');
            return;
        }

        // Skip unchanged account names.
        if (accountName === user.name) {
            return;
        }

        // Persist the account name and surface any failure.
        try {
            await updateUser({ name: accountName });
            toast({ body: 'Username saved' });
        } catch (error) {
            toast({
                body: error instanceof Error ? error.message : 'Failed to update username',
                type: 'error',
            });
        }
    };

    const deleteDialog = useDeleteDialog({
        title: 'Delete organization',
        mutation: deleteOrganization,
        items: memberships,
        getId: (membership) => membership.organization.id,
        description: (membership) => `Delete ${membership.organization.name} from your account?`,
        errorMessage: 'Failed to delete organization',
        fallbackDescription: 'Delete this organization?',
        onError: (message) => toast({ body: message, type: 'error' }),
    });
    const organizationColumns: TableColumn<(typeof memberships)[number]>[] = [
        {
            key: 'name',
            header: 'Name',
            width: proportional(1),
            renderCell: (membership) => (
                <HStack gap={3} align="center">
                    <Avatar
                        src={membership.organization.avatar || undefined}
                        name={membership.organization.name}
                        size="md"
                    />
                    <Link href={`/orgs/${membership.organization.slug}`} weight="semibold">
                        {membership.organization.name}
                    </Link>
                </HStack>
            ),
        },
        {
            key: 'role',
            header: 'Role',
            width: pixel(128),
            renderCell: (membership) => <Badge label={membership.role} />,
        },
        {
            key: 'actions',
            header: 'Actions',
            width: pixel(96),
            align: 'end',
            renderCell: (membership) =>
                membership.role === 'owner' ? (
                    <MoreMenu
                        label={`Open actions for ${membership.organization.name}`}
                        size="sm"
                        items={[{ label: 'Delete', onClick: () => deleteDialog.openFor(membership) }]}
                    />
                ) : null,
        },
    ];

    return (
        <PlatformLayout
            brandOnly
            tabs={[
                { href: '/organizations', icon: Building2, label: 'Organizations' },
                { href: '/settings', icon: Settings2, label: 'Settings' },
            ]}
        >
            <PageContainer gap={8}>
                <VStack gap={1}>
                    <Heading level={1}>Settings</Heading>
                    <Text type="supporting">Manage your account, preferences, and workspace access.</Text>
                </VStack>

                <div className="grid w-full grid-cols-1 items-start gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
                    <SideNav className="h-auto w-full">
                        <SideNavSection title="Settings" isHeaderHidden>
                            <SideNavItem
                                href={`${location.pathname}${location.search}#account`}
                                icon={<UserRound aria-hidden="true" size={16} />}
                                isSelected={section === 'account'}
                                label="Account"
                            />
                            <SideNavItem
                                href={`${location.pathname}${location.search}#appearance`}
                                icon={<Paintbrush aria-hidden="true" size={16} />}
                                isSelected={section === 'appearance'}
                                label="Appearance"
                            />
                            <SideNavItem
                                href={`${location.pathname}${location.search}#organizations`}
                                icon={<Building2 aria-hidden="true" size={16} />}
                                isSelected={section === 'organizations'}
                                label="Organizations"
                            />
                        </SideNavSection>
                    </SideNav>

                    <div className="min-w-0">
                        {section === 'account' ? (
                            <VStack gap={4}>
                                <VStack gap={1}>
                                    <Heading level={2}>Account</Heading>
                                    <Text type="supporting">
                                        Update your username. Your account email is read-only here.
                                    </Text>
                                </VStack>
                                <HStack gap={4} align="start" wrap="wrap">
                                    <TextInput
                                        label="Username"
                                        value={name}
                                        width="100%"
                                        isRequired
                                        isDisabled={isLoading || !user}
                                        status={accountError ? { type: 'error', message: accountError } : undefined}
                                        onChange={(value) => {
                                            setEditedName(value);
                                            setAccountError(null);
                                        }}
                                        onBlur={() => {
                                            void saveAccountName();
                                        }}
                                    />
                                    <TextInput
                                        label="Email"
                                        type="email"
                                        value={user?.email ?? ''}
                                        width="100%"
                                        isDisabled
                                    />
                                </HStack>
                            </VStack>
                        ) : null}

                        {section === 'appearance' ? (
                            <VStack gap={4}>
                                <VStack gap={1}>
                                    <Heading level={2}>Appearance</Heading>
                                    <Text type="supporting">
                                        Customize the accent color and radius for the interface.
                                    </Text>
                                </VStack>
                                <HStack gap={4} align="start" wrap="wrap">
                                    <Selector
                                        label="Accent color"
                                        options={ACCENT_OPTIONS.map((option) => ({
                                            value: option.value,
                                            label: option.label,
                                            icon: (
                                                <span
                                                    aria-hidden="true"
                                                    style={{
                                                        display: 'inline-block',
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: 9999,
                                                        backgroundColor: option.swatch,
                                                    }}
                                                />
                                            ),
                                        }))}
                                        value={accent}
                                        width={320}
                                        isDisabled={isPending}
                                        placeholder="Choose a color"
                                        onChange={(value) => {
                                            void updateUser({ accent: value as Accent }).catch(showAccountUpdateError);
                                        }}
                                    />
                                    <Slider
                                        label="Radius"
                                        value={editedRadius ?? radius}
                                        width={320}
                                        min={MIN_RADIUS}
                                        max={MAX_RADIUS}
                                        step={0.05}
                                        marks={RADIUS_MARKS}
                                        formatValue={formatRadius}
                                        isDisabled={isPending}
                                        onChange={(value: number) => {
                                            setEditedRadius(value);
                                        }}
                                        onChangeEnd={(value: number) => {
                                            void updateUser({ radius: value })
                                                .catch(showAccountUpdateError)
                                                .finally(() => {
                                                    setEditedRadius(null);
                                                });
                                        }}
                                    />
                                </HStack>
                            </VStack>
                        ) : null}

                        {section === 'organizations' ? (
                            <VStack gap={4}>
                                <HStack gap={4} justify="between" align="end" wrap="wrap">
                                    <VStack gap={1}>
                                        <Heading level={2}>Organizations</Heading>
                                        <Text type="supporting">
                                            Review the organizations connected to your personal account.
                                        </Text>
                                    </VStack>
                                    <CreateOrganization />
                                </HStack>
                                {isLoading && memberships.length === 0 ? null : (
                                    <Table
                                        columns={organizationColumns}
                                        data={memberships}
                                        density="compact"
                                        emptyState={<EmptyState title="No results." isCompact />}
                                        hasHover
                                        idKey={(membership) => membership.organization.id}
                                    />
                                )}
                            </VStack>
                        ) : null}
                    </div>
                </div>

                <DeleteConfirmation {...deleteDialog.dialogProps} />
            </PageContainer>
        </PlatformLayout>
    );
}
