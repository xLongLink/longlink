import { useEffect } from 'react';
import { NoIndex } from '@/components/Seo';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/lib/hooks/use-toast';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { OrganizationCell } from '@/components/Cells';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { TextInput } from '@astryxdesign/core/TextInput';
import { AvatarDialog } from '@/components/dialogs/Avatar';
import { PageContainer } from '@/components/PageContainer';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Menu, type MenuSection } from '@/components/ui/Menu';
import { accountNameSchema } from '@/components/settings/validation';
import { useDeleteOrganization } from '@/lib/hooks/use-organization';
import CreateOrganization from '@/components/dialogs/CreateOrganization';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import { DeleteConfirmation, useDeleteDialog } from '@/components/dialogs/DeleteConfirmation';
import { useAuthenticatedUser, useUpdateUser, useUserOrganizations } from '@/lib/hooks/use-user';
/** Renders the authenticated settings page. */
export default function Settings() {
    const toast = useToast();
    const user = useAuthenticatedUser();
    const { data: memberships = [], isLoading: isOrganizationsLoading } = useUserOrganizations();
    const updateUser = useUpdateUser();
    const deleteOrganization = useDeleteOrganization();
    const {
        control,
        handleSubmit,
        reset,
        clearErrors,
        formState: { isDirty, isSubmitting },
    } = useForm({
        defaultValues: { name: user.name },
        resolver: zodResolver(accountNameSchema),
        reValidateMode: 'onSubmit',
        shouldFocusError: false,
    });

    // Follow cached profile changes only while there is no local edit.
    useEffect(() => {
        if (!isDirty) {
            reset({ name: user.name });
        }
    }, [user.name, isDirty, reset]);

    /** Saves the edited account name when focus leaves its input. */
    const saveAccountName = handleSubmit(async ({ name }) => {
        // Keep profile saves from replacing an in-flight mutation's UI callbacks.
        if (updateUser.isPending || isSubmitting) {
            return;
        }

        // Skip unchanged account names.
        if (name === user.name) {
            reset({ name: user.name });
            return;
        }

        // Clear the draft after the saved profile reaches the cache.
        try {
            await updateUser.mutateAsync(
                { name },
                {
                    onSuccess: (updatedUser) => {
                        reset({ name: updatedUser.name });
                        toast({ body: 'Username saved' });
                    },
                }
            );
        } catch {
            // The mutation reports the error; retain the draft for another blur save.
        }
    });

    const deleteDialog = useDeleteDialog({
        title: 'Delete organization',
        mutation: deleteOrganization,
        items: memberships,
        getId: (membership) => membership.organization.id,
        description: (membership) => `Delete ${membership.organization.name} from your account?`,
        fallbackDescription: 'Delete this organization?',
    });

    // Prepare settings panels while Menu mounts only the selected content.
    const sections: MenuSection[] = [
        {
            title: 'Settings',
            isHeaderHidden: true,
            entries: [
                {
                    kind: 'item',
                    icon: 'userRound',
                    label: 'Account',
                    content: (
                        <Stack gap={4}>
                            <Heading level={2}>Account</Heading>
                            <Divider />
                            <Stack direction="horizontal" gap={4} align="start" wrap="wrap">
                                <Controller
                                    control={control}
                                    name="name"
                                    render={({ field, fieldState }) => (
                                        <TextInput
                                            label="Username"
                                            ref={field.ref}
                                            htmlName={field.name}
                                            isDisabled={updateUser.isPending || isSubmitting}
                                            value={field.value}
                                            width="100%"
                                            isRequired
                                            status={
                                                fieldState.error
                                                    ? { type: 'error', message: fieldState.error.message }
                                                    : undefined
                                            }
                                            onChange={(value) => {
                                                field.onChange(value);
                                                clearErrors('name');
                                            }}
                                            onBlur={() => {
                                                field.onBlur();
                                                void saveAccountName();
                                            }}
                                        />
                                    )}
                                />
                                <TextInput label="Email" type="email" value={user.email} width="100%" isDisabled />
                            </Stack>
                        </Stack>
                    ),
                },
                {
                    kind: 'item',
                    icon: 'building2',
                    label: 'Organizations',
                    content: (
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
                                    columns={
                                        [
                                            {
                                                key: 'name',
                                                header: 'Name',
                                                width: proportional(1),
                                                renderCell: (membership) => (
                                                    <OrganizationCell
                                                        endContent={<Badge label={membership.role} />}
                                                        organization={membership.organization}
                                                    />
                                                ),
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
                                                            items={[
                                                                {
                                                                    label: 'Delete',
                                                                    onClick: () => deleteDialog.openFor(membership),
                                                                },
                                                            ]}
                                                        />
                                                    ) : null,
                                            },
                                        ] satisfies TableColumn<(typeof memberships)[number]>[]
                                    }
                                />
                            )}
                        </Stack>
                    ),
                },
            ],
        },
    ];

    return (
        <PageContainer gap={8} padding={2}>
            <NoIndex title="Account Settings | LongLink" />
            <Stack paddingBlockStart={1} direction="horizontal" gap={3} align="center">
                <AvatarDialog
                    avatar={user.avatar}
                    formId="user-avatar-form"
                    isSaving={updateUser.isPending || isSubmitting}
                    onSave={(avatar) =>
                        updateUser.mutateAsync(
                            { avatar },
                            {
                                onSuccess: () => toast({ body: 'Avatar saved' }),
                            }
                        )
                    }
                    placeholder="https://example.com/avatar.png"
                    title="Avatar"
                >
                    {(avatar, open) => (
                        <IconButton
                            className="size-12"
                            icon={<Avatar name={user.name} size="lg" src={avatar} />}
                            label="Edit avatar"
                            tooltip="Edit avatar"
                            variant="ghost"
                            onClick={open}
                        />
                    )}
                </AvatarDialog>
                <Stack>
                    <Heading accessibilityLevel={1} level={4}>
                        {user.name}
                    </Heading>
                    <Text size="sm" type="supporting">
                        Your Account
                    </Text>
                </Stack>
            </Stack>

            <Menu sections={sections} />

            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </PageContainer>
    );
}
