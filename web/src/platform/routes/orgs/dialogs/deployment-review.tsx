import type { z } from 'zod';
import { api } from '@/lib/api';
import { ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/shadcn/input';
import { useSubmit } from '@/lib/hooks/use-submit';
import { Checkbox } from '@/components/shadcn/checkbox';
import { Text } from '@/components/longlink/display/text';
import { Stack } from '@/components/longlink/layout/stack';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { Heading } from '@/components/longlink/display/heading';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Controller, useForm, useWatch, type ResolverResult } from 'react-hook-form';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/shadcn/field';

type DeploymentReviewProps = {
    item: { id: string; name: string };
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void | Promise<void>;
};

type DeploymentDraft = { envs: Record<string, { value?: string; removed?: boolean }> };

/** Abbreviates digest references for release comparison while preserving tag-only images. */
function imageDigest(image: string) {
    // Keep the first twelve digest characters without changing authoritative image values.
    return image.match(/@(sha256:[a-f0-9]{12})[a-f0-9]*$/)?.[1] ?? image;
}

/** Owns fresh inspection, the deployment draft, and submission for one review attempt. */
export default function DeploymentReview({ item, onSuccess, onOpenChange }: DeploymentReviewProps) {
    const formId = useId();
    const [step, setStep] = useState(0);
    const advancing = useRef(false);

    // Keep inspection attempt-local, cancel on unmount, and never refresh beneath an edited draft.
    const path = `/api/v1/solutions/${item.id}/update`;

    const {
        data: candidate,
        isPending,
        refetch
    } = useQuery({
        queryKey: ['api', path, formId],
        queryFn: ({ signal }) => api(path, { signal }).json(schemas.zSolutionUpdateCheck),
        gcTime: 0,
        staleTime: Infinity,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false
    });

    // Preserve configured required secrets, and require values for new required environments.
    function isMissingRequired(
        environment: z.output<typeof schemas.zEnvironmentMetadata>,
        draft: DeploymentDraft['envs'][string] | undefined
    ) {
        return (
            environment.required &&
            (draft?.removed === true ||
                (!candidate?.configured_envs.includes(environment.name) && !draft?.value?.trim()))
        );
    }

    const form = useForm<DeploymentDraft>({
        defaultValues: { envs: {} },
        resolver: (values): ResolverResult<DeploymentDraft> => {
            const errors = Object.fromEntries(
                (candidate?.metadata.environments ?? [])
                    .filter((environment) => isMissingRequired(environment, values.envs[environment.name]))
                    .map(
                        (environment) =>
                            [
                                environment.name,
                                { value: { type: 'required', message: 'Please complete this field.' } }
                            ] as const
                    )
            );
            return Object.keys(errors).length ? { values: {}, errors: { envs: errors } } : { values, errors: {} };
        }
    });
    const envs = useWatch({ control: form.control, name: 'envs' });
    const requiredFieldPaths = (candidate?.metadata.environments ?? [])
        .filter((environment) => environment.required)
        .map((environment) => `envs.${environment.name}.value` as const);
    const missingRequired = (candidate?.metadata.environments ?? []).some((environment) =>
        isMissingRequired(environment, envs[environment.name])
    );
    const environments = (candidate?.metadata.environments ?? []).filter((environment) =>
        step === 1 ? environment.required : !environment.required
    );

    useEffect(() => {
        if (step !== 1) return;
        const invalid = candidate?.metadata.environments?.find(
            (environment) => environment.required && form.getFieldState(`envs.${environment.name}.value`).error
        );
        if (invalid) form.setFocus(`envs.${invalid.name}.value`);
    }, [step, candidate, form]);

    const hasChanges =
        candidate?.metadata.image !== candidate?.current_image ||
        Object.values(envs).some(({ value, removed }) => removed === true || value !== undefined);

    async function updateSolution(values: DeploymentDraft) {
        if (!candidate) return;
        const edits: [string, string | null][] = [];
        for (const [name, { value, removed }] of Object.entries(values.envs)) {
            if (removed === true) edits.push([name, null]);
            else if (value !== undefined) edits.push([name, value]);
        }
        if (candidate.metadata.image === candidate.current_image && edits.length === 0) return;
        await api.post(path, {
            json: schemas.zSolutionPatch.parse({
                envs: Object.fromEntries(edits),
                expected_revision_id: candidate.revision_id
            })
        });
        await onSuccess();
    }

    const submit = useSubmit(updateSolution, {
        onError: () => form.setError('root', { message: 'Could not update the Solution. Please try again.' })
    });

    // Keep version review and environment edits in the same revision-fenced form.
    return (
        <Dialog open onOpenChange={onOpenChange} title={`Update ${item.name}`} showHeader={false} bodyPadding={false}>
            <div className="grid min-h-full grid-cols-1 sm:grid-cols-2">
                <Stack justify="center" gap={4} padding={6} className="min-w-0">
                    <Heading level={2} size={4} align="center">
                        Update {item.name}
                    </Heading>
                    {!candidate ? (
                        <Text as="p" role="status">
                            {isPending ? 'Checking for updates…' : 'Could not check for updates.'}
                        </Text>
                    ) : (
                        <form
                            id={formId}
                            className="flex min-h-0 flex-col gap-4"
                            onSubmit={async (event) => {
                                event.preventDefault();
                                if (advancing.current || form.formState.isSubmitting) return;
                                advancing.current = true;
                                try {
                                    if (step === 0) {
                                        setStep(1);
                                    } else if (step === 1) {
                                        if (await form.trigger(requiredFieldPaths, { shouldFocus: true })) setStep(2);
                                    } else {
                                        await form.handleSubmit(submit, () => setStep(1))(event);
                                    }
                                } finally {
                                    advancing.current = false;
                                }
                            }}
                            noValidate
                            aria-busy={form.formState.isSubmitting}
                        >
                            {step === 0 ? (
                                <Stack direction="horizontal" align="center" gap={3} className="min-w-0">
                                    <span className="min-w-0 flex-1 break-all text-center font-mono text-sm text-muted-foreground">
                                        {candidate.current_version || imageDigest(candidate.current_image)}
                                    </span>
                                    <ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                                    <span className="min-w-0 flex-1 break-all text-center font-mono text-sm">
                                        {candidate.metadata.version || imageDigest(candidate.metadata.image)}
                                    </span>
                                </Stack>
                            ) : (
                                <fieldset
                                    disabled={form.formState.isSubmitting}
                                    className="flex min-w-0 flex-col gap-4 border-0 p-0"
                                >
                                    {environments.length === 0 && (
                                        <Text as="p" size="sm" tone="muted">
                                            No {step === 1 ? 'required' : 'optional'} environments.
                                        </Text>
                                    )}
                                    {environments.map((environment) => {
                                        // Resolve the configured secret and its local draft without exposing its value.
                                        const configured = candidate.configured_envs.includes(environment.name);

                                        const draft = envs[environment.name];
                                        const isRemoved = draft?.removed === true;

                                        // Configured secrets remain hidden; blank untouched inputs preserve them.
                                        return (
                                            <Stack key={environment.name} gap={2}>
                                                <Controller
                                                    name={`envs.${environment.name}.value`}
                                                    control={form.control}
                                                    render={({ field, fieldState }) => (
                                                        <Field
                                                            className="min-w-0"
                                                            data-disabled={isRemoved || undefined}
                                                            data-invalid={fieldState.invalid}
                                                        >
                                                            <Stack
                                                                direction="horizontal"
                                                                align="start"
                                                                justify="between"
                                                                gap={2}
                                                            >
                                                                <FieldLabel htmlFor={field.name}>
                                                                    {environment.name}
                                                                </FieldLabel>
                                                                {environment.description && (
                                                                    <FieldDescription
                                                                        id={`${field.name}-description`}
                                                                        className="min-w-0 text-right"
                                                                    >
                                                                        {environment.description}
                                                                    </FieldDescription>
                                                                )}
                                                            </Stack>
                                                            <Input
                                                                {...field}
                                                                id={field.name}
                                                                type="password"
                                                                value={field.value ?? ''}
                                                                disabled={isRemoved}
                                                                required={
                                                                    environment.required && (!configured || isRemoved)
                                                                }
                                                                aria-required={
                                                                    (environment.required &&
                                                                        (!configured || isRemoved)) ||
                                                                    undefined
                                                                }
                                                                aria-invalid={fieldState.invalid}
                                                                aria-describedby={
                                                                    [
                                                                        environment.description &&
                                                                            `${field.name}-description`,
                                                                        fieldState.error?.message &&
                                                                            `${field.name}-error`
                                                                    ]
                                                                        .filter(Boolean)
                                                                        .join(' ') || undefined
                                                                }
                                                                placeholder={
                                                                    isRemoved
                                                                        ? 'Will be removed'
                                                                        : configured
                                                                          ? 'Configured: preserve existing value'
                                                                          : environment.description || 'Enter value'
                                                                }
                                                            />
                                                            {fieldState.error?.message && (
                                                                <FieldError id={`${field.name}-error`}>
                                                                    {fieldState.error.message}
                                                                </FieldError>
                                                            )}
                                                        </Field>
                                                    )}
                                                />
                                                {configured && !environment.required && (
                                                    <Controller
                                                        name={`envs.${environment.name}.removed`}
                                                        control={form.control}
                                                        render={({ field }) => (
                                                            <Field orientation="horizontal">
                                                                <Checkbox
                                                                    id={`remove-${environment.name}`}
                                                                    name={field.name}
                                                                    inputRef={field.ref}
                                                                    checked={field.value ?? false}
                                                                    onCheckedChange={field.onChange}
                                                                    onBlur={field.onBlur}
                                                                />
                                                                <FieldLabel htmlFor={`remove-${environment.name}`}>
                                                                    Remove {environment.name}
                                                                </FieldLabel>
                                                            </Field>
                                                        )}
                                                    />
                                                )}
                                            </Stack>
                                        );
                                    })}
                                </fieldset>
                            )}
                            <FieldError errors={[form.formState.errors.root]} />
                        </form>
                    )}
                    <Stack direction="horizontal" align="center" justify="between" gap={2}>
                        <Button
                            type="button"
                            variant="link"
                            disabled={form.formState.isSubmitting}
                            onClick={() => {
                                if (candidate && step > 0) setStep(step - 1);
                                else onOpenChange(false);
                            }}
                        >
                            {candidate && step > 0 ? 'Back' : 'Cancel'}
                        </Button>
                        {candidate ? (
                            <Stack direction="horizontal" align="center" gap={2}>
                                <Button
                                    type="submit"
                                    form={formId}
                                    disabled={
                                        form.formState.isSubmitting || (step === 2 && (missingRequired || !hasChanges))
                                    }
                                >
                                    {step === 2 ? 'Update solution' : 'Next'}
                                </Button>
                            </Stack>
                        ) : (
                            !isPending && (
                                <Button type="button" onClick={() => void refetch()}>
                                    Retry
                                </Button>
                            )
                        )}
                    </Stack>
                </Stack>
                <Stack
                    direction="horizontal"
                    gap={0}
                    align="center"
                    justify="center"
                    padding={6}
                    className="h-full bg-black/10 dark:bg-black/20"
                >
                    <img
                        src="/images/solution.png"
                        alt=""
                        width={272}
                        height={279}
                        decoding="async"
                        className="w-full max-w-72 object-contain invert dark:invert-0"
                    />
                </Stack>
            </div>
        </Dialog>
    );
}
