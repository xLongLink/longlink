import { z } from 'zod';
import { api } from '@/lib/api';
import { Input } from '@/components/shadcn/input';
import { useSubmit } from '@/lib/hooks/use-submit';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field';

/** Owns image inspection and configuration for one creation attempt. */
export default function CreateSolution({
    organizationId,
    onSuccess,
    onOpenChange,
    ...dialogProps
}: { open: boolean; onOpenChange: (open: boolean) => void } & {
    organizationId: string;
    onSuccess: () => void | Promise<void>;
}) {
    const formId = useId();
    const [stage, setStage] = useState<'image' | 'configure'>('image');
    const [inspection, setInspection] = useState<{
        source: string;
        metadata: z.output<typeof schemas.zLongLinkMetadata>;
    }>();
    const [inspecting, setInspecting] = useState(false);
    const request = useRef<AbortController | null>(null);

    // Cancel an unfinished inspection when the dialog's attempt ends.
    useEffect(() => () => request.current?.abort(), []);

    const schema = schemas.zSolutionCreate
        .extend({
            image: z.string().trim().min(1),
            name: z.string().trim().pipe(schemas.zSolutionCreate.shape.name),
            description: z.string().max(255),
            envs: z.record(z.string(), z.string())
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
            setInspecting(true);
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
            } finally {
                setInspecting(false);
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
        <Dialog
            {...dialogProps}
            onOpenChange={onOpenChange}
            title="Create solution"
            footer={
                <>
                    <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
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
                    <Button type="submit" form={formId} disabled={pending}>
                        {stage === 'image' ? 'Inspect' : 'Create'}
                    </Button>
                </>
            }
        >
            <form
                id={formId}
                className="flex min-h-0 flex-col gap-4"
                onSubmit={(event) => {
                    if (stage === 'image') {
                        event.preventDefault();
                        void inspect(undefined);
                    } else {
                        void form.handleSubmit(submit)(event);
                    }
                }}
                noValidate
                aria-busy={pending}
            >
                <fieldset disabled={pending} className="flex min-w-0 flex-col gap-4 border-0 p-0">
                    {stage === 'image' ? (
                        <>
                            <img
                                src="/images/solution.png"
                                alt=""
                                width={272}
                                height={279}
                                decoding="async"
                                className="size-20 self-center object-contain invert dark:invert-0"
                            />
                            <Controller
                                name="image"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="solution-image">Image</FieldLabel>
                                        <Input
                                            {...field}
                                            id="solution-image"
                                            autoFocus
                                            placeholder="ghcr.io/longlink/dashboard:latest"
                                            aria-invalid={fieldState.invalid}
                                        />
                                        <FieldError errors={[fieldState.error]} />
                                    </Field>
                                )}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => form.setValue('image', 'ghcr.io/xlonglink/sample:latest')}
                            >
                                Use sample image
                            </Button>
                        </>
                    ) : (
                        <>
                            <img
                                src="/images/nametag.png"
                                alt=""
                                width={1448}
                                height={1086}
                                decoding="async"
                                className="size-20 self-center object-contain invert dark:invert-0"
                            />
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
                                                autoFocus={name === 'name'}
                                                aria-invalid={fieldState.invalid}
                                            />
                                            <FieldError errors={[fieldState.error]} />
                                        </Field>
                                    )}
                                />
                            ))}
                            {!!inspection?.metadata.environments?.length && (
                                <img
                                    src="/images/lock.png"
                                    alt=""
                                    width={1327}
                                    height={1186}
                                    decoding="async"
                                    className="size-20 self-center object-contain invert dark:invert-0"
                                />
                            )}
                            {(inspection?.metadata.environments ?? []).map((environment) => (
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
                        </>
                    )}
                </fieldset>
                <FieldError errors={[form.formState.errors.root]} />
            </form>
        </Dialog>
    );
}
