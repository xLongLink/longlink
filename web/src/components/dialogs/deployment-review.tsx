import { api } from '@/lib/api';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSubmit } from '@/lib/hooks/use-submit';
import { Button } from '@/components/shadcn/button';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { Checkbox } from '@/components/shadcn/checkbox';
import { Step, Wizard } from '@/components/custom/wizard';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Dialog, type DialogProps } from '@/components/custom/dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeTextInput } from '@/components/custom/native-text-input';
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';

type DeploymentReviewProps = DialogProps & {
    item: { id: string; name: string };
    onSuccess: () => void | Promise<void>;
};

/** Abbreviates digest references for release comparison while preserving tag-only images. */
function imageDigest(image: string) {
    // Keep the first twelve digest characters without changing authoritative image values.
    return image.match(/@(sha256:[a-f0-9]{12})[a-f0-9]*$/)?.[1] ?? image;
}

/** Owns fresh inspection, the deployment draft, and submission for one review attempt. */
export default function DeploymentReview({ item, onSuccess, onClose, ...dialogProps }: DeploymentReviewProps) {
    // Scope inspection and drafts to one freshly opened review attempt.
    const [attemptId] = useState(() => crypto.randomUUID());

    const form = useForm<{ envs: Record<string, { value?: string; removed?: boolean }> }>({
        defaultValues: { envs: {} },
        shouldFocusError: false
    });

    const envs = useWatch({ control: form.control, name: 'envs' });

    // Keep inspection attempt-local, cancel on unmount, and never refresh beneath an edited draft.
    const path = `/api/v1/solutions/${item.id}/update`;

    const {
        data: candidate,
        isPending,
        refetch
    } = useQuery({
        queryKey: ['api', path, attemptId],
        queryFn: ({ signal }) => api(path, { signal }).json(schemas.zSolutionUpdateCheck),
        gcTime: 0,
        staleTime: Infinity,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false
    });

    // Preserve configured required secrets, and require values for new required environments.
    const missingRequired = (candidate?.metadata.environments ?? []).some(
        (environment) =>
            environment.required &&
            (envs[environment.name]?.removed === true ||
                (!candidate?.configured_envs.includes(environment.name) && !envs[environment.name]?.value?.trim()))
    );

    const hasChanges =
        candidate?.metadata.image !== candidate?.current_image ||
        Object.values(envs).some((environment) => environment.value !== undefined || environment.removed === true);

    /** Submits the reviewed deployment while preserving untouched secrets. */
    async function updateSolution() {
        if (!candidate || missingRequired || !hasChanges) return;

        // Send edited secrets and explicit removals, preserving omitted values.
        const patchEnvs: Record<string, string | null> = {};

        // Removal takes precedence without discarding the edit retained for untoggling.
        for (const [name, environment] of Object.entries(envs)) {
            if (environment.removed === true) patchEnvs[name] = null;
            else if (environment.value !== undefined) patchEnvs[name] = environment.value;
        }

        await api.post(`/api/v1/solutions/${item.id}/update`, {
            json: schemas.zSolutionPatch.parse({ envs: patchEnvs, expected_revision_id: candidate.revision_id })
        });
        await onSuccess();
    }

    const submit = useSubmit(updateSolution, {
        onError: () => form.setError('root', { message: 'Could not update the Solution. Please try again.' })
    });

    // Share wizard navigation while retaining revision fencing and configured-secret semantics.
    return (
        <Dialog {...dialogProps} onClose={onClose}>
            {!candidate ? (
                <div className="h-[min(560px,calc(100dvh-calc(var(--spacing)*10)*4))] min-h-0 min-w-0 overflow-hidden">
                    <div className="box-border h-full min-h-0 min-w-0 flex-1 overflow-auto p-8">
                        <Stack gap={4} align="center" justify="center" minHeight="100%">
                            <h2 className="font-semibold tracking-tight text-3xl">Update {item.name}</h2>
                            <p role="status">{isPending ? 'Checking for updates…' : 'Could not check for updates.'}</p>
                            <Stack direction="horizontal" gap={2}>
                                <Button variant="ghost" onClick={onClose}>
                                    Cancel
                                </Button>
                                {!isPending && <Button onClick={() => void refetch()}>Retry</Button>}
                            </Stack>
                        </Stack>
                    </div>
                </div>
            ) : (
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
                            height="min(560px, calc(100dvh - var(--spacing) * 40))"
                            backVariant="ghost"
                            finalAction={
                                <Button type="submit" disabled={missingRequired || !hasChanges}>
                                    Update solution
                                </Button>
                            }
                        >
                            <Step label="Image">
                                <Stack gap={4}>
                                    <Stack gap={3} align="center">
                                        <RefreshCw className="size-20 text-muted-foreground" aria-hidden="true" />
                                        <h2 className="font-semibold tracking-tight text-3xl text-center">
                                            Update {item.name}
                                        </h2>
                                    </Stack>
                                    <Stack direction="horizontal" gap={4} align="center">
                                        <div className="min-h-0 min-w-0 grow">
                                            <Stack padding={3} className="rounded-lg bg-muted">
                                                <span className="font-mono text-sm text-muted-foreground block text-center break-all">
                                                    {candidate.current_version || imageDigest(candidate.current_image)}
                                                </span>
                                            </Stack>
                                        </div>
                                        <ArrowRight
                                            className="size-5 shrink-0 text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                        <div className="min-h-0 min-w-0 grow">
                                            <Stack padding={3} className="rounded-lg bg-muted">
                                                <span className="font-mono text-sm block text-center break-all">
                                                    {candidate.metadata.version ||
                                                        imageDigest(candidate.metadata.image)}
                                                </span>
                                            </Stack>
                                        </div>
                                    </Stack>
                                </Stack>
                            </Step>
                            <Step
                                label="Environment"
                                fields={(candidate.metadata.environments ?? []).map(({ name }) => `envs.${name}.value`)}
                            >
                                <Stack gap={4}>
                                    <Stack gap={3} align="center">
                                        <RefreshCw className="size-20 text-muted-foreground" aria-hidden="true" />
                                        <h2 className="font-semibold tracking-tight text-3xl text-center">
                                            Configure your environment
                                        </h2>
                                    </Stack>
                                    {!candidate.metadata.environments?.length && (
                                        <span className="text-muted-foreground">
                                            This solution does not require environment variables.
                                        </span>
                                    )}
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
                                                            !environment.required ||
                                                            configured ||
                                                            !!value?.trim() ||
                                                            'Please complete this field.'
                                                    }}
                                                    render={({ field, fieldState }) => (
                                                        <NativeTextInput
                                                            {...field}
                                                            label={environment.name}
                                                            description={environment.description ?? undefined}
                                                            type="password"
                                                            value={field.value ?? ''}
                                                            error={fieldState.error?.message}
                                                            disabled={isRemoved}
                                                            required={
                                                                environment.required && (!configured || isRemoved)
                                                            }
                                                            placeholder={
                                                                isRemoved
                                                                    ? 'Will be removed'
                                                                    : configured
                                                                      ? 'Configured: preserve existing value'
                                                                      : environment.description || 'Enter value'
                                                            }
                                                        />
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
                                </Stack>
                            </Step>
                        </Wizard>
                        <FieldError errors={[form.formState.errors.root]} />
                    </form>
                </FormProvider>
            )}
        </Dialog>
    );
}
