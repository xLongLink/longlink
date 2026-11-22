import { z } from 'zod';
import { api } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/shadcn/input';
import { useSubmit } from '@/lib/hooks/use-submit';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@/components/longlink/layout/stack';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { Heading } from '@/components/longlink/display/heading';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field';

/** Owns image inspection and configuration for one creation attempt. */
export default function CreateSolution({
    organizationId,
    onSuccess,
    onOpenChange
}: {
    organizationId: string;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void | Promise<void>;
}) {
    const [stage, setStage] = useState<'image' | 'configure'>('image');
    const [inspection, setInspection] = useState<{
        source: string;
        metadata: z.output<typeof schemas.zLongLinkMetadata>;
    }>();
    const [inspecting, startInspection] = useTransition();
    const request = useRef<AbortController | null>(null);

    // Cancel an unfinished inspection when the dialog's attempt ends.
    useEffect(() => () => request.current?.abort(), []);

    const schema = schemas.zSolutionCreate
        .extend({
            image: z.string().trim().min(1),
            name: z.string().trim().pipe(schemas.zSolutionCreate.shape.name),
            description: schemas.zSolutionCreate.shape.description.unwrap().unwrap(),
            envs: schemas.zSolutionCreate.shape.envs.unwrap()
        })
        .superRefine((values, context) => {
            for (const environment of inspection?.metadata.environments ?? []) {
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
        defaultValues: { image: '', name: '', description: '', envs: {} }
    });

    // Validate only the image before fetching the configuration it defines.
    const inspect = useSubmit(
        async () => {
            form.clearErrors('root');

            try {
                if (!(await form.trigger('image', { shouldFocus: true }))) return;
                const image = form.getValues('image').trim();

                if (inspection?.source === image) {
                    setStage('configure');
                    return;
                }

                const controller = new AbortController();
                request.current = controller;
                const metadata = await api(`/api/v1/organizations/${organizationId}/image`, {
                    searchParams: { image },
                    signal: controller.signal
                }).json(schemas.zLongLinkMetadata);

                if (controller.signal.aborted) return;

                form.setValue('image', image);
                form.setValue('description', metadata.description ?? '');
                form.setValue('envs', Object.fromEntries((metadata.environments ?? []).map(({ name }) => [name, ''])));
                form.clearErrors();
                setInspection({ source: image, metadata });
                setStage('configure');
            } catch (error) {
                if (!request.current?.signal.aborted) throw error;
            }
        },
        { onError: () => form.setError('root', { message: 'Could not inspect the image. Please try again.' }) }
    );

    // Create only the inspected configuration; omit blank optional environments.
    const submit = useSubmit(
        async (data: z.output<typeof schema>) => {
            if (!inspection || data.image !== inspection.source) return;
            const json = {
                ...data,
                description: data.description || null,
                envs: Object.fromEntries(Object.entries(data.envs).filter(([, value]) => value !== ''))
            };

            await api.post(`/api/v1/organizations/${organizationId}/solutions`, { json });
            await onSuccess();
        },
        { onError: () => form.setError('root', { message: 'Could not create the Solution. Please try again.' }) }
    );

    const pending = inspecting || form.formState.isSubmitting;

    return (
        <Dialog open onOpenChange={onOpenChange} title="Create solution" showHeader={false} bodyPadding={false}>
            <form
                className="grid min-h-full grid-cols-1 items-center sm:grid-cols-2"
                onSubmit={(event) => {
                    if (stage === 'image') {
                        event.preventDefault();
                        startInspection(async () => {
                            await inspect(undefined);
                        });
                    } else {
                        void form.handleSubmit(submit)(event);
                    }
                }}
                noValidate
                aria-busy={pending}
            >
                <fieldset disabled={pending} className="flex min-w-0 flex-col gap-4 border-0 p-6">
                    <Heading level={2} size={4} align="center">
                        {stage === 'image' ? 'Create solution' : 'Configure solution'}
                    </Heading>
                    {stage === 'image' ? (
                        <>
                            <Field data-invalid={Boolean(form.formState.errors.image)}>
                                <Stack direction="horizontal" align="center" justify="between" gap={2}>
                                    <FieldLabel htmlFor="solution-image">Image</FieldLabel>
                                    <button
                                        type="button"
                                        className="cursor-pointer text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
                                        onClick={() => form.setValue('image', 'ghcr.io/xlonglink/sample:latest')}
                                    >
                                        Use sample image
                                    </button>
                                </Stack>
                                <Input
                                    {...form.register('image')}
                                    id="solution-image"
                                    autoFocus
                                    placeholder="ghcr.io/longlink/dashboard:latest"
                                    aria-invalid={Boolean(form.formState.errors.image)}
                                />
                                <FieldError errors={[form.formState.errors.image]} />
                            </Field>
                        </>
                    ) : (
                        <>
                            {(['name', 'description'] as const).map((name) => (
                                <Field key={name} data-invalid={Boolean(form.formState.errors[name])}>
                                    <FieldLabel htmlFor={`solution-${name}`}>
                                        {name === 'name' ? 'Name' : 'Description'}
                                    </FieldLabel>
                                    <Input
                                        {...form.register(name)}
                                        id={`solution-${name}`}
                                        autoFocus={name === 'name'}
                                        aria-invalid={Boolean(form.formState.errors[name])}
                                    />
                                    <FieldError errors={[form.formState.errors[name]]} />
                                </Field>
                            ))}
                            {(inspection?.metadata.environments ?? []).map((environment) => (
                                <Field
                                    key={environment.name}
                                    data-invalid={Boolean(form.formState.errors.envs?.[environment.name])}
                                >
                                    <FieldLabel htmlFor={`solution-env-${environment.name}`}>
                                        {environment.name}
                                    </FieldLabel>
                                    <Input
                                        {...form.register(`envs.${environment.name}`)}
                                        id={`solution-env-${environment.name}`}
                                        placeholder={environment.description ?? undefined}
                                        aria-invalid={Boolean(form.formState.errors.envs?.[environment.name])}
                                    />
                                    <FieldError errors={[form.formState.errors.envs?.[environment.name]]} />
                                </Field>
                            ))}
                        </>
                    )}
                    <FieldError errors={[form.formState.errors.root]} />
                    <Stack direction="horizontal" align="center" justify="between" gap={2}>
                        <Button type="button" variant="link" disabled={pending} onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Stack direction="horizontal" align="center" gap={2}>
                            {stage === 'configure' && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={pending}
                                    onClick={() => {
                                        form.clearErrors('root');
                                        setStage('image');
                                    }}
                                >
                                    Back
                                </Button>
                            )}
                            <Button type="submit" disabled={pending}>
                                {stage === 'image' ? 'Inspect' : 'Create'}
                            </Button>
                        </Stack>
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
                        src={stage === 'image' ? '/images/solution.png' : '/images/nametag.png'}
                        alt=""
                        width={stage === 'image' ? 272 : 1448}
                        height={stage === 'image' ? 279 : 1086}
                        decoding="async"
                        className="w-full max-w-72 object-contain invert dark:invert-0"
                    />
                </Stack>
            </form>
        </Dialog>
    );
}
