import { useId } from 'react';
import { api } from '@/lib/api';
import { Input } from '@/components/shadcn/input';
import { useSubmit } from '@/lib/hooks/use-submit';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/shadcn/field';

export function RegistryForm({
    base,
    onSuccess,
    onOpenChange,
    ...dialogProps
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    base: string;
    onSuccess: () => Promise<void>;
}) {
    const formId = useId();
    const form = useForm({ resolver: zodResolver(schemas.zRegistryCreateWritable), defaultValues: { credential: '' } });

    async function save(data: { credential: string }) {
        await api.post(`${base}/registries`, { json: data });
        await onSuccess();
    }

    const submit = useSubmit(save, {
        onError: () => form.setError('root', { message: 'Could not save the registry. Please try again.' })
    });

    return (
        <Dialog
            {...dialogProps}
            onOpenChange={onOpenChange}
            title="Connect a registry"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={form.formState.isSubmitting}
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" form={formId} disabled={form.formState.isSubmitting}>
                        Save
                    </Button>
                </>
            }
        >
            <form
                id={formId}
                className="flex flex-col gap-4"
                onSubmit={(event) => {
                    void form.handleSubmit(submit)(event);
                }}
                noValidate
                aria-busy={form.formState.isSubmitting}
            >
                <img
                    src="/images/lock.png"
                    alt=""
                    width={1327}
                    height={1186}
                    decoding="async"
                    className="size-20 self-center object-contain invert dark:invert-0"
                />
                <fieldset disabled={form.formState.isSubmitting} className="flex min-w-0 flex-col gap-4 border-0 p-0">
                    <p>GitHub Container Registry (ghcr.io)</p>
                    <Controller
                        name="credential"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor="registry-credential">Personal access token (classic)</FieldLabel>
                                <Input
                                    {...field}
                                    id="registry-credential"
                                    type="password"
                                    placeholder="ghp_..."
                                    autoComplete="new-password"
                                    aria-invalid={fieldState.invalid}
                                    aria-describedby="registry-credential-description"
                                />
                                <FieldDescription id="registry-credential-description">
                                    Requires the read:packages scope.
                                </FieldDescription>
                                <FieldError errors={[fieldState.error]} />
                            </Field>
                        )}
                    />
                </fieldset>
                <FieldError errors={[form.formState.errors.root]} />
            </form>
        </Dialog>
    );
}
