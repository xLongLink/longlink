import { Dialog } from '@/components/ui/Dialog';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useEffect, useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { avatarFormSchema } from '@/components/settings/validation';

type AvatarDialogProps = {
    avatar: string;
    children: (avatar: string, open: () => void) => ReactNode;
    formId: string;
    isSaving: boolean;
    isDisabled?: boolean;
    onSave: (avatar: string) => Promise<unknown>;
    placeholder: string;
    title: string;
};

/** Owns the avatar draft and shares its live preview with the editor trigger. */
export function AvatarDialog({
    avatar,
    children,
    formId,
    isSaving,
    isDisabled = false,
    onSave,
    placeholder,
    title,
}: AvatarDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const {
        control,
        handleSubmit,
        reset,
        clearErrors,
        formState: { isDirty, isSubmitting },
    } = useForm({
        defaultValues: { avatar },
        resolver: zodResolver(avatarFormSchema),
        reValidateMode: 'onSubmit',
    });
    const draft = useWatch({ control, name: 'avatar' });
    const isBusy = isSaving || isSubmitting;

    // Follow refreshed server values without replacing an open, edited draft.
    useEffect(() => {
        if (!isOpen || !isDirty) {
            reset({ avatar });
        }
    }, [avatar, isOpen, isDirty, reset]);

    /** Discards canceled edits and blocks dismissal during a save. */
    function onOpenChange(open: boolean) {
        if (isBusy || (open && isDisabled)) {
            return;
        }
        reset({ avatar });
        setIsOpen(open);
    }

    return (
        <>
            {children(isOpen ? draft : avatar, () => onOpenChange(true))}
            <Dialog isOpen={isOpen} purpose="form" title={title} onOpenChange={onOpenChange}>
                <form
                    id={formId}
                    noValidate
                    onSubmit={handleSubmit(async (values) => {
                        if (isBusy || isDisabled) {
                            return;
                        }

                        // Keep failed drafts available; the mutation cache reports server errors.
                        if (values.avatar !== avatar) {
                            try {
                                await onSave(values.avatar);
                            } catch {
                                return;
                            }
                        }
                        reset(values);
                        setIsOpen(false);
                    })}
                >
                    <Controller
                        control={control}
                        name="avatar"
                        render={({ field, fieldState }) => (
                            <TextInput
                                label="Avatar URL"
                                ref={field.ref}
                                htmlName={field.name}
                                value={field.value}
                                onBlur={field.onBlur}
                                onChange={(value) => {
                                    field.onChange(value);
                                    clearErrors('avatar');
                                }}
                                width="100%"
                                isOptional
                                isDisabled={isBusy || isDisabled}
                                placeholder={placeholder}
                                status={
                                    fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined
                                }
                            />
                        )}
                    />
                </form>
                <Stack direction="horizontal" gap={2} justify="end">
                    <Button label="Cancel" variant="ghost" isDisabled={isBusy} onClick={() => onOpenChange(false)} />
                    <Button
                        form={formId}
                        type="submit"
                        label="Save"
                        variant="primary"
                        isLoading={isBusy}
                        isDisabled={isDisabled}
                    />
                </Stack>
            </Dialog>
        </>
    );
}
