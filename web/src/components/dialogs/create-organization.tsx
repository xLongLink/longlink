import { z } from 'zod';
import { api } from '@/lib/api';
import { Input } from '@/components/shadcn/input';
import { useSubmit } from '@/lib/hooks/use-submit';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Illustration } from '@/components/ui/illustration';
import { Dialog, type DialogProps } from '@/components/custom/dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field';
import { NativeButton as Button } from '@/components/custom/native-button';
import { zOrganizationCreate } from '@/lib/generated/platform-api-v1/zod.gen';

const organizationSchema = zOrganizationCreate.extend({
    name: z.string().trim().min(1, 'Please complete this field.').pipe(zOrganizationCreate.shape.name)
});

/** Notifies the parent after a successful organization creation request. */
export default function CreateOrganization({
    onSuccess,
    ...dialogProps
}: DialogProps & { onSuccess: () => Promise<void> }) {
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
        <Dialog paddingInline={0} {...dialogProps}>
            <div className="flex h-[min(560px,calc(100dvh-calc(var(--spacing)*10)*4))] min-h-0 min-w-0 overflow-hidden">
                <div className="box-border h-full min-h-0 min-w-0 flex-1 overflow-auto p-8">
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
                                        <Illustration
                                            src="/images/organization.png"
                                            alt=""
                                            className="size-20 object-contain"
                                            width={1254}
                                            height={1254}
                                            decoding="async"
                                        />
                                        <Stack gap={0}>
                                            <h2 className="font-semibold tracking-tight text-3xl text-center">
                                                New organization
                                            </h2>
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
                                        <Button
                                            label="Create organization"
                                            variant="default"
                                            type="submit"
                                            style={{ width: '100%' }}
                                        />
                                    </Stack>
                                </Stack>
                            </fieldset>
                            <FieldError errors={[form.formState.errors.root]} />
                        </form>
                    </Stack>
                </div>
                <div className="hidden min-w-0 flex-[0_0_50%] overflow-hidden bg-muted md:flex">
                    <Stack width="100%" height="100%" align="center" justify="center" padding={6}>
                        <Illustration
                            src="/images/organization-city.png"
                            alt="Hand-drawn city skyline reflected in water."
                            className="h-full w-full object-contain"
                            width={941}
                            height={1672}
                            decoding="async"
                        />
                    </Stack>
                </div>
            </div>
        </Dialog>
    );
}
