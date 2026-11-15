import { z } from 'zod';
import { api } from '@/lib/api';
import { Input } from '@/components/shadcn/input';
import { useSubmit } from '@/lib/hooks/use-submit';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Dialog } from '@/components/custom/native-dialog';
import { Button } from '@/components/longlink/action/button';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { DialogContent, DialogTitle } from '@/components/shadcn/dialog';
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field';
import { zOrganizationCreate } from '@/lib/generated/platform-api-v1/zod.gen';

const organizationSchema = zOrganizationCreate.extend({
    name: z.string().trim().min(1, 'Please complete this field.').pipe(zOrganizationCreate.shape.name)
});

/** Notifies the parent after a successful organization creation request. */
export default function CreateOrganization({
    onSuccess,
    ...dialogProps
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => Promise<void>;
}) {
    const form = useForm({ resolver: zodResolver(organizationSchema), defaultValues: { name: '' } });

    /** Creates the organization before awaiting the parent's success workflow. */
    async function createOrganization(data: z.output<typeof organizationSchema>) {
        // Let the parent handle the successful creation.
        await api.post('/api/v1/organizations', { json: data });
        await onSuccess();
    }

    const submit = useSubmit(createOrganization, {
        onError: () => form.setError('root', { message: 'Could not create the organization. Please try again.' })
    });

    // Keep the split dialog compact and within the dynamic viewport.
    return (
        <Dialog {...dialogProps}>
            <DialogContent>
                <div className="flex max-h-[80dvh] min-h-0 min-w-0 overflow-auto">
                    <div className="min-h-0 min-w-0 flex-1">
                        <Stack height="100%" justify="center" width="max-content" maxWidth="100%" className="mx-auto">
                            <form
                                onSubmit={(event) => {
                                    void form.handleSubmit(submit)(event);
                                }}
                                noValidate
                                aria-busy={form.formState.isSubmitting}
                            >
                                <fieldset disabled={form.formState.isSubmitting} className="contents">
                                    <Stack gap={10}>
                                        <Stack gap={2} align="center">
                                            <img
                                                src="/images/organization.png"
                                                alt=""
                                                className="size-20 object-contain invert dark:invert-0"
                                                width={1254}
                                                height={1254}
                                                decoding="async"
                                            />
                                            <Stack gap={0}>
                                                <DialogTitle>New organization</DialogTitle>
                                                <p className="text-muted-foreground text-center">
                                                    A place for your workflows and data
                                                </p>
                                            </Stack>
                                        </Stack>
                                        {/* Let the subtitle size the column, then stretch the controls to match. */}
                                        <Stack gap={4} width={0} className="min-w-full">
                                            <Controller
                                                name="name"
                                                control={form.control}
                                                render={({ field, fieldState }) => (
                                                    <Field data-invalid={fieldState.invalid}>
                                                        <FieldLabel htmlFor="organization-name">Name</FieldLabel>
                                                        <Input
                                                            {...field}
                                                            id="organization-name"
                                                            placeholder="Example LongLink"
                                                            required
                                                            aria-required="true"
                                                            aria-invalid={fieldState.invalid}
                                                        />
                                                        <FieldError errors={[fieldState.error]} />
                                                    </Field>
                                                )}
                                            />
                                            <Button type="submit" className="w-full">
                                                Create organization
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </fieldset>
                                <FieldError errors={[form.formState.errors.root]} />
                            </form>
                        </Stack>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
