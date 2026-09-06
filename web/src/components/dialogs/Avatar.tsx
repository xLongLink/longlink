import { Dialog } from '@/components/ui/Dialog';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';

type AvatarDialogProps = {
    avatar: string;
    error: string | null;
    formId: string;
    isOpen: boolean;
    isSaving: boolean;
    onAvatarChange: (avatar: string) => void;
    onOpenChange: (open: boolean) => void;
    onSave: () => Promise<void>;
    placeholder: string;
    title: string;
};

/** Renders a controlled dialog for editing an avatar URL. */
export function AvatarDialog({
    avatar,
    error,
    formId,
    isOpen,
    isSaving,
    onAvatarChange,
    onOpenChange,
    onSave,
    placeholder,
    title,
}: AvatarDialogProps) {
    return (
        <Dialog isOpen={isOpen} purpose="form" title={title} onOpenChange={onOpenChange}>
            <form
                id={formId}
                onSubmit={(event) => {
                    event.preventDefault();
                    void onSave();
                }}
            >
                <TextInput
                    label="Avatar URL"
                    value={avatar}
                    width="100%"
                    isOptional
                    isDisabled={isSaving}
                    placeholder={placeholder}
                    status={error ? { type: 'error', message: error } : undefined}
                    onChange={onAvatarChange}
                />
            </form>
            <Stack direction="horizontal" gap={2} justify="end">
                <Button label="Cancel" variant="ghost" isDisabled={isSaving} onClick={() => onOpenChange(false)} />
                <Button form={formId} type="submit" label="Save" variant="primary" isLoading={isSaving} />
            </Stack>
        </Dialog>
    );
}
