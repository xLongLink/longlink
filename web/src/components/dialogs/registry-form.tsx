import { api } from '@/lib/api';
import { Input } from '@/components/shadcn/input';
import { useSubmit } from '@/lib/hooks/use-submit';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Dialog } from '@/components/custom/native-dialog';
import { Button } from '@/components/longlink/action/button';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { DialogContent, DialogTitle } from '@/components/shadcn/dialog';
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
    const form = useForm({ resolver: zodResolver(schemas.zRegistryCreateWritable), defaultValues: { credential: '' } });

    async function save(data: { credential: string }) {
        await api.post(`${base}/registries`, { json: data });
        await onSuccess();
    }

    const submit = useSubmit(save, {
        onError: () => form.setError('root', { message: 'Could not save the registry. Please try again.' })
    });

    return (
        <Dialog {...dialogProps} onOpenChange={onOpenChange}>
            <DialogContent>
                <Stack className="max-h-[80dvh] overflow-auto">
                    <Stack gap={8} width="100%" maxWidth={640} className="mx-auto">
                        <Stack gap={3} align="center">
                            <img
                                src="/images/lock.png"
                                alt=""
                                className="size-20 object-contain invert dark:invert-0"
                                decoding="async"
                            />
                            <Stack gap={0}>
                                <DialogTitle>Connect a registry</DialogTitle>
                                <p className="text-muted-foreground text-center">
                                    Allow LongLink to pull your private container images
                                </p>
                            </Stack>
                        </Stack>
                        <form
                            onSubmit={(event) => {
                                void form.handleSubmit(submit)(event);
                            }}
                            noValidate
                            aria-busy={form.formState.isSubmitting}
                        >
                            <fieldset disabled={form.formState.isSubmitting} className="contents">
                                <Stack gap={3}>
                                    <p>GitHub Container Registry (ghcr.io)</p>
                                    <Stack>
                                        <Controller
                                            name="credential"
                                            control={form.control}
                                            render={({ field, fieldState }) => (
                                                <Field data-invalid={fieldState.invalid}>
                                                    <FieldLabel htmlFor="registry-credential">
                                                        Personal access token (classic)
                                                    </FieldLabel>
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
                                    </Stack>
                                    <Stack direction="horizontal" gap={2} justify="between" wrap="wrap">
                                        <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit">Save</Button>
                                    </Stack>
                                </Stack>
                            </fieldset>
                            <FieldError errors={[form.formState.errors.root]} />
                        </form>
                    </Stack>
                </Stack>
            </DialogContent>
        </Dialog>
    );
}
