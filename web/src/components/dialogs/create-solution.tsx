import { cn } from 'cn';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import { Input } from '@/components/shadcn/input';
import { useSubmit } from '@/lib/hooks/use-submit';
import { zodResolver } from '@hookform/resolvers/zod';
import { Step, Wizard } from '@/components/custom/wizard';
import { Dialog } from '@/components/custom/native-dialog';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field';
import { Button, buttonVariants } from '@/components/longlink/action/button';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';

/** Owns one creation attempt, shared by the organization list and settings pages. */
export default function CreateSolution({
    organizationId,
    onSuccess,
    onOpenChange,
    ...dialogProps
}: { open: boolean; onOpenChange: (open: boolean) => void } & {
    organizationId: string;
    onSuccess: () => void | Promise<void>;
}) {
    const [metadata, setMetadata] = useState<z.output<typeof schemas.zLongLinkMetadata>>();

    const schema = schemas.zSolutionCreate
        .extend({
            image: z.string().trim().min(1),
            name: z.string().trim().pipe(schemas.zSolutionCreate.shape.name),
            description: z.string().max(255),
            envs: z.record(z.string(), z.string())
        })
        .superRefine((values, context) => {
            for (const environment of metadata?.environments ?? []) {
                if (environment.required && !values.envs[environment.name]?.trim()) {
                    context.addIssue({
                        code: 'custom',
                        path: ['envs', environment.name],
                        message: 'Please complete this field.'
                    });
                }
            }
        });

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: { image: '', name: '', description: '', envs: {} },
        shouldFocusError: false
    });

    /** Inspects the chosen image before opening its configuration. */
    async function inspectImage() {
        const image = form.getValues('image').trim();

        // Advance only when the image metadata is valid; reinspection resets image-specific drafts.
        const inspected = schemas.zLongLinkMetadata.parse(
            await api(`/api/v1/organizations/${organizationId}/image`, { searchParams: { image } }).json()
        );

        form.setValue('image', image);
        form.setValue('description', inspected.description ?? '');
        form.setValue('envs', Object.fromEntries((inspected.environments ?? []).map(({ name }) => [name, ''])));
        setMetadata(inspected);
    }

    /** Creates the configured Solution before completing the parent-owned success workflow. */
    async function createSolution(data: z.output<typeof schema>) {
        // Omit blank optional environments and notify the parent only after creation succeeds.
        const json = {
            ...data,
            description: data.description || null,
            envs: Object.fromEntries(Object.entries(data.envs).filter(([, value]) => value !== ''))
        };

        await api.post(`/api/v1/organizations/${organizationId}/solutions`, { json });
        await onSuccess();
    }

    const submit = useSubmit(createSolution, {
        onError: () => form.setError('root', { message: 'Could not create the Solution. Please try again.' })
    });

    return (
        <Dialog {...dialogProps} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create solution</DialogTitle>
                </DialogHeader>
                <div className="max-h-[80dvh] overflow-auto">
                    <FormProvider {...form}>
                        <form
                            onSubmit={(event) => {
                                void form.handleSubmit(submit)(event);
                            }}
                            noValidate
                            aria-busy={form.formState.isSubmitting}
                        >
                            <Wizard
                                showProgress={false}
                                onCancel={() => onOpenChange(false)}
                                next={(step) => (step === 0 ? { label: 'Inspect', action: inspectImage } : undefined)}
                            >
                                <Step label="Image" fields={['image']}>
                                    <Stack gap={8}>
                                        <Stack gap={3} align="center">
                                            <img
                                                src="/images/solution.png"
                                                alt=""
                                                className="size-20 object-contain invert dark:invert-0"
                                                width={272}
                                                height={279}
                                                decoding="async"
                                            />
                                            <Stack gap={0}>
                                                <h2 className="font-semibold tracking-tight text-3xl text-center">
                                                    Choose a Solution image
                                                </h2>
                                                <p className="text-muted-foreground text-center">
                                                    Start with a container image or try the sample Solution
                                                </p>
                                            </Stack>
                                        </Stack>
                                        <Stack className="relative">
                                            <Controller
                                                name="image"
                                                control={form.control}
                                                render={({ field, fieldState }) => (
                                                    <Field data-invalid={fieldState.invalid}>
                                                        <FieldLabel htmlFor="solution-image">Image</FieldLabel>
                                                        <Input
                                                            {...field}
                                                            id="solution-image"
                                                            placeholder="ghcr.io/longlink/dashboard:latest"
                                                            aria-invalid={fieldState.invalid}
                                                        />
                                                        <FieldError errors={[fieldState.error]} />
                                                    </Field>
                                                )}
                                            />
                                            <button
                                                type="button"
                                                className={cn(
                                                    buttonVariants({ variant: 'link', size: null }),
                                                    'absolute top-0 right-0 underline'
                                                )}
                                                onClick={() =>
                                                    form.setValue('image', 'ghcr.io/xlonglink/sample:latest')
                                                }
                                            >
                                                <span className="text-muted-foreground text-base">
                                                    Use sample image
                                                </span>
                                            </button>
                                        </Stack>
                                    </Stack>
                                </Step>
                                <Step label="Metadata" fields={['name', 'description']}>
                                    <Stack gap={8}>
                                        <Stack gap={3} align="center">
                                            <img
                                                src="/images/nametag.png"
                                                alt=""
                                                className="size-20 object-contain invert dark:invert-0"
                                                width={1448}
                                                height={1086}
                                                decoding="async"
                                            />
                                            <Stack gap={0}>
                                                <h2 className="font-semibold tracking-tight text-3xl text-center">
                                                    Make it yours
                                                </h2>
                                                <p className="text-muted-foreground text-center">
                                                    Give your Solution a name and description
                                                </p>
                                            </Stack>
                                        </Stack>
                                        <Stack gap={3}>
                                            {(['name', 'description'] as const).map((name) => (
                                                <Controller
                                                    key={name}
                                                    name={name}
                                                    control={form.control}
                                                    render={({ field, fieldState }) => (
                                                        <Field data-invalid={fieldState.invalid}>
                                                            <FieldLabel htmlFor={`solution-${name}`}>
                                                                {name === 'name' ? 'Name' : 'Description'}
                                                            </FieldLabel>
                                                            <Input
                                                                {...field}
                                                                id={`solution-${name}`}
                                                                aria-invalid={fieldState.invalid}
                                                            />
                                                            <FieldError errors={[fieldState.error]} />
                                                        </Field>
                                                    )}
                                                />
                                            ))}
                                        </Stack>
                                    </Stack>
                                </Step>
                                <Step
                                    label="Environment"
                                    fields={(metadata?.environments ?? []).map(({ name }) => `envs.${name}`)}
                                >
                                    <Stack gap={8}>
                                        <Stack gap={3} align="center">
                                            <img
                                                src="/images/lock.png"
                                                alt=""
                                                className="size-20 object-contain invert dark:invert-0"
                                                width={1327}
                                                height={1186}
                                                decoding="async"
                                            />
                                            <Stack gap={0}>
                                                <h2 className="font-semibold tracking-tight text-3xl text-center">
                                                    Configure your environment
                                                </h2>
                                                <p className="text-muted-foreground text-center">
                                                    Set the values your Solution needs to run
                                                </p>
                                            </Stack>
                                        </Stack>
                                        <Stack gap={3}>
                                            {(metadata?.environments ?? []).map((environment) => (
                                                <Controller
                                                    key={environment.name}
                                                    name={`envs.${environment.name}`}
                                                    control={form.control}
                                                    render={({ field, fieldState }) => (
                                                        <Field data-invalid={fieldState.invalid}>
                                                            <FieldLabel htmlFor={`solution-env-${environment.name}`}>
                                                                {environment.name}
                                                            </FieldLabel>
                                                            <Input
                                                                {...field}
                                                                id={`solution-env-${environment.name}`}
                                                                value={field.value ?? ''}
                                                                placeholder={environment.description ?? undefined}
                                                                aria-invalid={fieldState.invalid}
                                                            />
                                                            <FieldError errors={[fieldState.error]} />
                                                        </Field>
                                                    )}
                                                />
                                            ))}
                                        </Stack>
                                    </Stack>
                                    <Button type="submit" variant="default">
                                        Create
                                    </Button>
                                </Step>
                            </Wizard>
                            <FieldError errors={[form.formState.errors.root]} />
                        </form>
                    </FormProvider>
                </div>
            </DialogContent>
        </Dialog>
    );
}
