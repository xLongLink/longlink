import { useState } from 'react';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Avatar } from '@astryxdesign/core/Avatar';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { TextInput } from '@astryxdesign/core/TextInput';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Building2, Settings2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pixel, proportional } from '@astryxdesign/core/Table';
import type { UserUpdate } from '@/lib/generated/platform-api-v1/types.gen';
import { Auth } from '@/components/Auth';
import { useToast } from '@/lib/hooks/use-toast';
import { useDeleteDialog } from '@/lib/utils';
import PlatformLayout from '@/platform/layout';
import { useUserProfile } from '@/lib/hooks/use-user';
import { fetchApiJson, requestApi } from '@/lib/api';
import { platformApiPath } from '@/lib/platform-api';
import { PageContainer } from '@/components/PageContainer';
import { Menu, MenuItem, MenuSection } from '@/components/ui/Menu';
import { Table, TableColumn } from '@/components/ui/Table';
import { zUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';
import CreateOrganization from '@/components/dialogs/CreateOrganization';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { userOrganizationsQueryKey, userProfileQueryKey } from '@/lib/query-keys';
/** Renders the authenticated settings page. */
export default function Settings() {
    const toast = useToast();
    const { user, memberships, isLoading: isProfileLoading, isOrganizationsLoading } = useUserProfile();
    const queryClient = useQueryClient();
    const { mutateAsync: updateUser } = useMutation({
        mutationFn: async (payload: UserUpdate) =>
            zUserSummary.parse(
                await fetchApiJson(platformApiPath('/me'), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
            ),
        onSuccess: (updatedUser) => {
            queryClient.setQueryData(userProfileQueryKey, updatedUser);
        },
    });
    const deleteOrganization = useMutation({
        mutationFn: (organizationId: string) =>
            requestApi(platformApiPath(`/organizations/${organizationId}`), { method: 'DELETE' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: userOrganizationsQueryKey }),
    });
    const [editedName, setEditedName] = useState<string | null>(null);
    const [accountError, setAccountError] = useState<string | null>(null);
    const name = editedName ?? user?.name ?? '';
    const accountName = name.trim();
    const isLoading = isProfileLoading || isOrganizationsLoading;

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
    return (
        <Auth>
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

                    <Menu>
                        <MenuSection title="Settings" isHeaderHidden>
                            <MenuItem icon="userRound" label="Account">
                                <VStack gap={4}>
                                    <Heading level={2}>Account</Heading>
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
                            </MenuItem>
                            <MenuItem icon="building2" label="Organizations">
                                <VStack gap={4}>
                                    <HStack gap={4} justify="between" align="end" wrap="wrap">
                                        <Heading level={2}>Organizations</Heading>
                                        <CreateOrganization />
                                    </HStack>
                                    {isLoading && memberships.length === 0 ? null : (
                                        <Table
                                            data={memberships}
                                            density="compact"
                                            emptyState={<EmptyState title="No results." isCompact />}
                                            hasHover
                                            idKey={(membership) => membership.organization.id}
                                        >
                                            <TableColumn<(typeof memberships)[number]>
                                                field="name"
                                                header="Name"
                                                width={proportional(1)}
                                            >
                                                {(membership) => (
                                                    <HStack gap={3} align="center">
                                                        <Avatar
                                                            src={membership.organization.avatar || undefined}
                                                            name={membership.organization.name}
                                                            size="md"
                                                        />
                                                        <Link
                                                            href={`/orgs/${membership.organization.slug}`}
                                                            weight="semibold"
                                                        >
                                                            {membership.organization.name}
                                                        </Link>
                                                    </HStack>
                                                )}
                                            </TableColumn>
                                            <TableColumn<(typeof memberships)[number]>
                                                field="role"
                                                header="Role"
                                                width={pixel(128)}
                                            >
                                                {(membership) => <Badge label={membership.role} />}
                                            </TableColumn>
                                            <TableColumn<(typeof memberships)[number]>
                                                field="actions"
                                                header="Actions"
                                                width={pixel(96)}
                                                align="end"
                                            >
                                                {(membership) =>
                                                    membership.role === 'owner' ? (
                                                        <MoreMenu
                                                            label={`Open actions for ${membership.organization.name}`}
                                                            size="sm"
                                                            items={[
                                                                {
                                                                    label: 'Delete',
                                                                    onClick: () => deleteDialog.openFor(membership),
                                                                },
                                                            ]}
                                                        />
                                                    ) : null
                                                }
                                            </TableColumn>
                                        </Table>
                                    )}
                                </VStack>
                            </MenuItem>
                        </MenuSection>
                    </Menu>

                    <DeleteConfirmation {...deleteDialog.dialogProps} />
                </PageContainer>
            </PlatformLayout>
        </Auth>
    );
}
