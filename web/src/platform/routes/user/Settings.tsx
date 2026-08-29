import { api } from '@/lib/api';
import { useState } from 'react';
import { Stack } from '@/components/ui/Stack';
import { useDeleteDialog } from '@/lib/utils';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/lib/hooks/use-toast';
import { Badge } from '@astryxdesign/core/Badge';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { useUserProfile } from '@/lib/hooks/use-user';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { TextInput } from '@astryxdesign/core/TextInput';
import UserAvatar from '@/components/settings/UserAvatar';
import { PageContainer } from '@/components/PageContainer';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { Menu, MenuItem, MenuSection } from '@/components/ui/Menu';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';
import CreateOrganization from '@/components/dialogs/CreateOrganization';
import type { UserUpdate } from '@/lib/generated/platform-api-v1/types.gen';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
/** Renders the authenticated settings page. */
export default function Settings() {
    const toast = useToast();
    const { user, memberships, isOrganizationsLoading } = useUserProfile();
    const queryClient = useQueryClient();
    const { mutateAsync: updateUser } = useMutation({
        mutationFn: async (payload: UserUpdate) =>
            zUserSummary.parse(
                await api('/api/v1/me', {
                    json: payload,
                    method: 'PATCH',
                }).json()
            ),
        onSuccess: (updatedUser) => {
            queryClient.setQueryData(['api', '/api/v1/me'], updatedUser);
        },
    });
    const deleteOrganization = useMutation({
        mutationFn: (organizationId: string) => api(`/api/v1/organizations/${organizationId}`, { method: 'DELETE' }),
        onSuccess: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/organizations'] }),
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/me/organizations'] }),
            ]),
    });
    const [editedName, setEditedName] = useState<string | null>(null);
    const [accountError, setAccountError] = useState<string | null>(null);
    const name = editedName ?? user.name;
    const accountName = name.trim();

    /** Saves the edited account name when focus leaves its input. */
    const saveAccountName = async () => {
        setAccountError(null);

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
        <PageContainer gap={8} padding={2}>
            <Stack className="pt-1" direction="horizontal" gap={3} align="center">
                <UserAvatar name={user.name} src={user.avatar} />
                <Stack>
                    <Heading accessibilityLevel={1} level={4}>
                        {user.name}
                    </Heading>
                    <Text size="sm" type="supporting">
                        Your Account
                    </Text>
                </Stack>
            </Stack>

            <Menu>
                <MenuSection title="Settings" isHeaderHidden>
                    <MenuItem icon="userRound" label="Account">
                        <Stack gap={4}>
                            <Heading level={2}>Account</Heading>
                            <Divider />
                            <Stack direction="horizontal" gap={4} align="start" wrap="wrap">
                                <TextInput
                                    label="Username"
                                    value={name}
                                    width="100%"
                                    isRequired
                                    isDisabled={isOrganizationsLoading}
                                    status={accountError ? { type: 'error', message: accountError } : undefined}
                                    onChange={(value) => {
                                        setEditedName(value);
                                        setAccountError(null);
                                    }}
                                    onBlur={() => {
                                        void saveAccountName();
                                    }}
                                />
                                <TextInput label="Email" type="email" value={user.email} width="100%" isDisabled />
                            </Stack>
                        </Stack>
                    </MenuItem>
                    <MenuItem icon="building2" label="Organizations">
                        <Stack gap={4}>
                            <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                                <Heading level={2}>Organizations</Heading>
                                <CreateOrganization />
                            </Stack>
                            <Divider />
                            {isOrganizationsLoading && memberships.length === 0 ? null : (
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
                                            <Stack direction="horizontal" gap={3} align="center">
                                                <Avatar
                                                    kind="organization"
                                                    src={membership.organization.avatar}
                                                    name={membership.organization.name}
                                                    size="md"
                                                />
                                                <Stack>
                                                    <Link
                                                        href={`/orgs/${membership.organization.slug}`}
                                                        weight="semibold"
                                                    >
                                                        {membership.organization.name}
                                                    </Link>
                                                    <Text type="supporting">Organization</Text>
                                                </Stack>
                                            </Stack>
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
                        </Stack>
                    </MenuItem>
                </MenuSection>
            </Menu>

            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </PageContainer>
    );
}
