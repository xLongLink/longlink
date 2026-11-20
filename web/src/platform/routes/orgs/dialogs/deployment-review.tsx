import type { z } from 'zod';
import { useId } from 'react';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/shadcn/input';
import { useSubmit } from '@/lib/hooks/use-submit';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { Checkbox } from '@/components/shadcn/checkbox';
import { Stack } from '@/components/longlink/layout/stack';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { Controller, useForm, useWatch } from 'react-hook-form';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/shadcn/field';

type DeploymentReviewProps = {
    item: { id: string; name: string };
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void | Promise<void>;
};

/** Abbreviates digest references for release comparison while preserving tag-only images. */
function imageDigest(image: string) {
    // Keep the first twelve digest characters without changing authoritative image values.
    return image.match(/@(sha256:[a-f0-9]{12})[a-f0-9]*$/)?.[1] ?? image;
}

/** Owns fresh inspection, the deployment draft, and submission for one review attempt. */
export default function DeploymentReview({ item, onSuccess, onOpenChange }: DeploymentReviewProps) {
    const formId = useId();

    const form = useForm<{ envs: Record<string, { value?: string; removed?: boolean }> }>({
        defaultValues: { envs: {} }
    });

    const envs = useWatch({ control: form.control, name: 'envs' });

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
    function isMissingRequired(environment: z.output<typeof schemas.zEnvironmentMetadata>, value: string | undefined) {
        return (
            environment.required &&
            (envs[environment.name]?.removed === true ||
                (!candidate?.configured_envs.includes(environment.name) && !value?.trim()))
        );
    }

    const missingRequired = (candidate?.metadata.environments ?? []).some((environment) =>
        isMissingRequired(environment, envs[environment.name]?.value)
    );

    const edits: [string, string | null][] = [];
    for (const [name, { value, removed }] of Object.entries(envs)) {
        if (removed === true) edits.push([name, null]);
        else if (value !== undefined) edits.push([name, value]);
    }
    const hasChanges = candidate?.metadata.image !== candidate?.current_image || edits.length > 0;

    async function updateSolution() {
        if (!candidate || missingRequired || !hasChanges) return;
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
        <Dialog
            open
            onOpenChange={onOpenChange}
            title={`Update ${item.name}`}
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
                    {candidate ? (
                        <Button
                            type="submit"
                            form={formId}
                            disabled={form.formState.isSubmitting || missingRequired || !hasChanges}
                        >
                            Update solution
                        </Button>
                    ) : (
                        !isPending && (
                            <Button type="button" onClick={() => void refetch()}>
                                Retry
                            </Button>
                        )
                    )}
                </>
            }
        >
            {!candidate ? (
                <p role="status">{isPending ? 'Checking for updates…' : 'Could not check for updates.'}</p>
            ) : (
                <form
                    id={formId}
                    className="flex min-h-0 flex-col gap-4"
                    onSubmit={(event) => {
                        void form.handleSubmit(submit)(event);
                    }}
                    noValidate
                    aria-busy={form.formState.isSubmitting}
                >
                    <RefreshCw className="size-20 self-center text-muted-foreground" aria-hidden="true" />
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="min-w-0 flex-1 break-all font-mono text-sm text-muted-foreground">
                            {candidate.current_version || imageDigest(candidate.current_image)}
                        </span>
                        <ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="min-w-0 flex-1 break-all font-mono text-sm">
                            {candidate.metadata.version || imageDigest(candidate.metadata.image)}
                        </span>
                    </div>
                    <fieldset
                        disabled={form.formState.isSubmitting}
                        className="flex min-w-0 flex-col gap-4 border-0 p-0"
                    >
                        {(candidate.metadata.environments ?? []).map((environment) => {
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
                                        rules={{
                                            validate: (value) =>
                                                !isMissingRequired(environment, value) || 'Please complete this field.'
                                        }}
                                        render={({ field, fieldState }) => (
                                            <Field
                                                className="min-w-0"
                                                data-disabled={isRemoved || undefined}
                                                data-invalid={fieldState.invalid}
                                            >
                                                <FieldLabel htmlFor={field.name}>{environment.name}</FieldLabel>
                                                {environment.description && (
                                                    <FieldDescription id={`${field.name}-description`}>
                                                        {environment.description}
                                                    </FieldDescription>
                                                )}
                                                <Input
                                                    {...field}
                                                    id={field.name}
                                                    type="password"
                                                    value={field.value ?? ''}
                                                    disabled={isRemoved}
                                                    required={environment.required && (!configured || isRemoved)}
                                                    aria-required={
                                                        (environment.required && (!configured || isRemoved)) ||
                                                        undefined
                                                    }
                                                    aria-invalid={fieldState.invalid}
                                                    aria-describedby={
                                                        [
                                                            environment.description && `${field.name}-description`,
                                                            fieldState.error?.message && `${field.name}-error`
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
                    <FieldError errors={[form.formState.errors.root]} />
                </form>
            )}
        </Dialog>
    );
}
