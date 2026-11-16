import { z } from 'zod';
import { useId } from 'react';
import { api } from '@/lib/api';
import { Input } from '@/components/shadcn/input';
import { useSubmit } from '@/lib/hooks/use-submit';
import { Button } from '@/components/shadcn/button';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Dialog } from '@/components/longlink/layout/dialog';
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field';
import { zOrganizationCreate } from '@/lib/generated/platform-api-v1/zod.gen';

const organizationSchema = zOrganizationCreate.extend({
    name: z.string().trim().min(1, 'Please complete this field.').pipe(zOrganizationCreate.shape.name)
});

/** Notifies the parent after a successful organization creation request. */
export default function CreateOrganization({
    onSuccess,
    onOpenChange,
    ...dialogProps
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => Promise<void>;
}) {
    const formId = useId();
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

    // Keep the form in the shared dialog body and its actions in the fixed footer.
    return (
        <Dialog
            {...dialogProps}
            onOpenChange={onOpenChange}
            title="New organization"
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
                        Create organization
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
                    src="/images/organization.png"
                    alt=""
                    width={1254}
                    height={1254}
                    decoding="async"
                    className="size-20 self-center object-contain invert dark:invert-0"
                />
                <fieldset disabled={form.formState.isSubmitting} className="contents">
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
                </fieldset>
                <FieldError errors={[form.formState.errors.root]} />
            </form>
        </Dialog>
    );
}
