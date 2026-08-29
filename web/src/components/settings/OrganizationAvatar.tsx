import { useState } from 'react';
import { Stack } from '@/components/ui/Stack';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/lib/hooks/use-toast';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { avatarUrlSchema } from '@/components/settings/validation';
import { useUpdateOrganization } from '@/lib/hooks/use-organization';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';

type OrganizationAvatarProps = {
    canManage: boolean;
    name: string;
    organizationId: string;
    src: string;
};

/** Renders an Organization avatar and its URL editor. */
export default function OrganizationAvatar({ canManage, name, organizationId, src }: OrganizationAvatarProps) {
    const toast = useToast();
    const updateOrganization = useUpdateOrganization(organizationId);
    const [editedAvatar, setEditedAvatar] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const avatar = editedAvatar ?? src;

    /** Saves the current avatar URL and closes the dialog on success. */
    async function saveAvatar() {
        setAvatarError(null);

        // Ignore unavailable, unauthorized, and unchanged Organizations.
        if (!canManage) {
            return;
        }
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

        // Persist the URL and keep the response available while Organization data refreshes.
        try {
            const updated = await updateOrganization.mutateAsync({ avatar: normalizedAvatar });
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
        if (updateOrganization.isPending) {
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
                icon={<Avatar kind="organization" name={name} size="lg" src={avatar || undefined} />}
                isDisabled={!canManage}
                label="Edit organization avatar"
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
                            title="Organization avatar"
                            subtitle="Use an HTTP(S) image URL."
                            onOpenChange={handleOpenChange}
                        />
                    }
                    content={
                        <LayoutContent>
                            <form
                                id="organization-avatar-form"
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
                                    isDisabled={updateOrganization.isPending}
                                    placeholder="https://example.com/org.png"
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
                                    isDisabled={updateOrganization.isPending}
                                    onClick={() => handleOpenChange(false)}
                                />
                                <Button
                                    form="organization-avatar-form"
                                    type="submit"
                                    label="Save"
                                    variant="primary"
                                    isLoading={updateOrganization.isPending}
                                />
                            </Stack>
                        </LayoutFooter>
                    }
                />
            </Dialog>
        </>
    );
}
