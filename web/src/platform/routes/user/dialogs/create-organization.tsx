import { z } from 'zod';
import { api } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/shadcn/input';
import { useSubmit } from '@/lib/hooks/use-submit';
import { Button } from '@/components/shadcn/button';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@/components/longlink/action/link';
import { Stack } from '@/components/longlink/layout/stack';
import { Dialog } from '@/components/longlink/layout/dialog';
import { Heading } from '@/components/longlink/display/heading';
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field';
import { zOrganizationCreate } from '@/lib/generated/platform-api-v1/zod.gen';

const organizationSchema = zOrganizationCreate.extend({
    name: z.string().trim().min(1, 'Please complete this field.').pipe(zOrganizationCreate.shape.name)
});

/** Notifies the parent after a successful organization creation request. */
export default function CreateOrganization({
    onSuccess,
    onOpenChange
}: {
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

    return (
        <Dialog open showHeader={false} bodyPadding={false} onOpenChange={onOpenChange} title="New organization">
            <form
                className="grid min-h-full grid-cols-1 items-center sm:grid-cols-2"
                onSubmit={form.handleSubmit(submit)}
                noValidate
                aria-busy={form.formState.isSubmitting}
            >
                <fieldset disabled={form.formState.isSubmitting} className="flex min-w-0 flex-col gap-4 border-0 p-6">
                    <Heading level={2} size={4} align="center">
                        New organization
                    </Heading>
                    <Field data-invalid={Boolean(form.formState.errors.name)}>
                        <FieldLabel htmlFor="organization-name">Name</FieldLabel>
                        <Input
                            {...form.register('name')}
                            id="organization-name"
                            placeholder="Example LongLink"
                            required
                            aria-required="true"
                            aria-invalid={Boolean(form.formState.errors.name)}
                        />
                        <FieldError errors={[form.formState.errors.name]} />
                    </Field>
                    <FieldError errors={[form.formState.errors.root]} />
                    <Stack direction="horizontal" wrap="wrap" align="center" justify="between" gap={2}>
                        <Link disabled={form.formState.isSubmitting} onClick={() => onOpenChange(false)}>
                            Cancel
                        </Link>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            Create organization
                        </Button>
                    </Stack>
                </fieldset>
                <Stack
                    direction="horizontal"
                    gap={0}
                    align="center"
                    justify="center"
                    padding={6}
                    className="h-full bg-black/10 dark:bg-black/20"
                >
                    <img
                        src="/images/new-organization.png"
                        alt=""
                        width={768}
                        height={768}
                        decoding="async"
                        className="w-full max-w-72 object-contain invert dark:invert-0"
                    />
                </Stack>
            </form>
        </Dialog>
    );
}
