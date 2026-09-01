import { api } from '@/lib/api';
import { useState } from 'react';
import { useDeleteDialog } from '@/lib/utils';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/lib/hooks/use-toast';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { useUserProfile } from '@/lib/hooks/use-user';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { TextInput } from '@astryxdesign/core/TextInput';
import { PageContainer } from '@/components/PageContainer';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { IconButton } from '@astryxdesign/core/IconButton';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { avatarUrlSchema } from '@/components/settings/validation';
import { Menu, MenuItem, MenuSection } from '@/components/ui/Menu';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';
import CreateOrganization from '@/components/dialogs/CreateOrganization';
import type { UserUpdate } from '@/lib/generated/platform-api-v1/types.gen';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
/** Renders the authenticated settings page. */
export default function Settings() {
    const toast = useToast();
    const { user, memberships, isOrganizationsLoading } = useUserProfile();
    const queryClient = useQueryClient();
    const updateUser = useMutation({
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
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/organizations/slug'] }),
            ]),
    });
    const [editedName, setEditedName] = useState<string | null>(null);
    const [accountError, setAccountError] = useState<string | null>(null);
    const [editedAvatar, setEditedAvatar] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
    const name = editedName ?? user.name;
    const avatar = editedAvatar ?? user.avatar;

    /** Saves the edited account name when focus leaves its input. */
    const saveAccountName = async () => {
        setAccountError(null);
        const accountName = name.trim();

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
            await updateUser.mutateAsync({ name: accountName });
            setEditedName(null);
            toast({ body: 'Username saved' });
        } catch (error) {
            toast({
                body: error instanceof Error ? error.message : 'Failed to update username',
                type: 'error',
            });
        }
    };

    /** Saves the current avatar URL and closes the dialog on success. */
    async function saveAvatar() {
        setAvatarError(null);

        const normalizedAvatar = avatar.trim();
        if (normalizedAvatar === user.avatar) {
            setIsAvatarDialogOpen(false);
            return;
        }

        // Require an empty value or an HTTP(S) URL.
        if (!avatarUrlSchema.safeParse(normalizedAvatar).success) {
            setAvatarError('Enter a valid HTTP(S) avatar URL.');
            return;
        }

        // Persist the URL and use the refreshed profile value.
        try {
            await updateUser.mutateAsync({ avatar: normalizedAvatar });
            setEditedAvatar(null);
            setIsAvatarDialogOpen(false);
            toast({ body: 'Avatar saved' });
        } catch (mutationError) {
            toast({
                body: mutationError instanceof Error ? mutationError.message : 'Failed to update avatar',
                type: 'error',
            });
        }
    }

    /** Opens or closes the avatar editor without retaining canceled changes. */
    function handleAvatarDialogOpenChange(isOpen: boolean) {
        // Keep the dialog available while a submitted avatar URL is still saving.
        if (updateUser.isPending) {
            return;
        }

        setIsAvatarDialogOpen(isOpen);

        // Discard the dialog's draft when the user closes it without saving.
        if (!isOpen) {
            setEditedAvatar(null);
            setAvatarError(null);
        }
    }

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
            <Stack paddingBlockStart={1} direction="horizontal" gap={3} align="center">
                <IconButton
                    className="size-12"
                    icon={<Avatar name={user.name} size="lg" src={avatar || undefined} />}
                    label="Edit avatar"
                    tooltip="Edit avatar"
                    variant="ghost"
                    onClick={() => {
                        setEditedAvatar(user.avatar);
                        setAvatarError(null);
                        setIsAvatarDialogOpen(true);
                    }}
                />
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
                                    onBlur={() => void saveAccountName()}
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
                            {isOrganizationsLoading ? null : (
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
            <Dialog isOpen={isAvatarDialogOpen} purpose="form" onOpenChange={handleAvatarDialogOpenChange}>
                <Layout
                    header={
                        <DialogHeader
                            title="Avatar"
                            subtitle="Use an HTTP(S) image URL."
                            onOpenChange={handleAvatarDialogOpenChange}
                        />
                    }
                    content={
                        <LayoutContent>
                            <form
                                id="user-avatar-form"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    void saveAvatar();
                                }}
                            >
                                <TextInput
                                    label="Avatar URL"
                                    value={avatar}
                                    width="100%"
                                    isOptional
                                    isDisabled={updateUser.isPending}
                                    placeholder="https://example.com/avatar.png"
                                    status={avatarError ? { type: 'error', message: avatarError } : undefined}
                                    onChange={(value) => {
                                        setEditedAvatar(value);
                                        setAvatarError(null);
                                    }}
                                />
                            </form>
                        </LayoutContent>
                    }
                    footer={
                        <LayoutFooter>
                            <Stack direction="horizontal" gap={2} justify="end">
                                <Button
                                    label="Cancel"
                                    variant="ghost"
                                    isDisabled={updateUser.isPending}
                                    onClick={() => handleAvatarDialogOpenChange(false)}
                                />
                                <Button
                                    form="user-avatar-form"
                                    type="submit"
                                    label="Save"
                                    variant="primary"
                                    isLoading={updateUser.isPending}
                                />
                            </Stack>
                        </LayoutFooter>
                    }
                />
            </Dialog>
        </PageContainer>
    );
}
