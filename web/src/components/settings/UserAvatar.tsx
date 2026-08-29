import { api } from '@/lib/api';
import { useState } from 'react';
import { Stack } from '@/components/ui/Stack';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/lib/hooks/use-toast';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { avatarUrlSchema } from '@/components/settings/validation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';

type UserAvatarProps = {
    name: string;
    src: string;
};

/** Renders the current user's avatar and its URL editor. */
export default function UserAvatar({ name, src }: UserAvatarProps) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const updateUser = useMutation({
        mutationFn: async (avatar: string) =>
            zUserSummary.parse(
                await api('/api/v1/me', {
                    json: { avatar },
                    method: 'PATCH',
                }).json()
            ),
        onSuccess: (updatedUser) => {
            queryClient.setQueryData(['api', '/api/v1/me'], updatedUser);
        },
    });
    const [editedAvatar, setEditedAvatar] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const avatar = editedAvatar ?? src;

    /** Saves the current avatar URL and closes the dialog on success. */
    async function saveAvatar() {
        setAvatarError(null);

        const normalizedAvatar = avatar.trim();
        if (normalizedAvatar === src) {
            setIsDialogOpen(false);
            return;
        }

        // Require an empty value or an HTTP(S) URL.
        if (!avatarUrlSchema.safeParse(normalizedAvatar).success) {
            setAvatarError('Enter a valid HTTP(S) avatar URL.');
            return;
        }

        // Persist the URL and keep the response available while profile data refreshes.
        try {
            const updated = await updateUser.mutateAsync(normalizedAvatar);
            setEditedAvatar(updated.avatar);
            setIsDialogOpen(false);
            toast({ body: 'Avatar saved' });
        } catch (mutationError) {
            toast({
                body: mutationError instanceof Error ? mutationError.message : 'Failed to update avatar',
                type: 'error',
            });
        }
    }

    /** Opens or closes the avatar editor without retaining canceled changes. */
    function handleOpenChange(isOpen: boolean) {
        // Keep the dialog available while a submitted avatar URL is still saving.
        if (updateUser.isPending) {
            return;
        }

        setIsDialogOpen(isOpen);

        // Discard the dialog's draft when the user closes it without saving.
        if (!isOpen) {
            setEditedAvatar(null);
            setAvatarError(null);
        }
    }

    return (
        <>
            <IconButton
                className="size-12"
                icon={<Avatar name={name} size="lg" src={avatar || undefined} />}
                label="Edit avatar"
                tooltip="Edit avatar"
                variant="ghost"
                onClick={() => {
                    setEditedAvatar(src);
                    setAvatarError(null);
                    setIsDialogOpen(true);
                }}
            />
            <Dialog isOpen={isDialogOpen} purpose="form" onOpenChange={handleOpenChange}>
                <Layout
                    header={
                        <DialogHeader
                            title="Avatar"
                            subtitle="Use an HTTP(S) image URL."
                            onOpenChange={handleOpenChange}
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
                                    onClick={() => handleOpenChange(false)}
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
        </>
    );
}
