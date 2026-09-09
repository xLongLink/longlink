import { z } from 'zod';
import { api, ApiError } from '@/lib/api';
import { ArrowRight } from 'lucide-react';
import { Text } from '@astryxdesign/core/Text';
import { Dialog } from '@/components/ui/Dialog';
import { useId, useRef, useState } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { FieldStatus } from '@astryxdesign/core/FieldStatus';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { OrganizationSolutionSummary, SolutionUpdateCheck } from '@/lib/generated/platform-api-v1/types.gen';

const environmentChangeSchema = z.discriminatedUnion('action', [
    z.object({ action: z.literal('untouched') }),
    z.object({ action: z.literal('remove') }),
    z.object({ action: z.literal('replace'), value: z.string() }),
]);

type EnvironmentChange = z.infer<typeof environmentChangeSchema>;

/** Omitted configured values are preserved; null and blank replacements are missing. */
function isMissingRequiredEnv(change: EnvironmentChange, required: boolean, configured: boolean) {
    return (
        required &&
        (change.action === 'untouched' ? !configured : change.action === 'remove' || change.value.trim().length === 0)
    );
}

/** Review a source candidate and edit only explicitly changed environment values. */
export default function UpdateSolution({
    solution,
    candidate,
    onClose,
    onInvalidate,
}: {
    solution: OrganizationSolutionSummary;
    candidate: SolutionUpdateCheck;
    onClose: () => void;
    onInvalidate: () => Promise<void>;
}) {
    const toast = useToast();
    const formId = useId();
    const [busy, setBusy] = useState(false);
    const submitting = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const environments = candidate.metadata.environments ?? [];
    const configured = candidate.configured_envs;

    // Mutable source tags stay the same across updates; compare immutable image identities instead.
    const currentLabel = candidate.current_image.replace(/^.+@(sha256:[a-f0-9]{12})[a-f0-9]*$/, '$1');
    const candidateLabel = candidate.image.replace(/^.+@(sha256:[a-f0-9]{12})[a-f0-9]*$/, '$1');
    const schema = z.object({ envs: z.record(z.string(), environmentChangeSchema) }).superRefine((value, ctx) => {
        // Existing required secrets remain valid without exposing or resubmitting their values.
        for (const { name, required } of environments) {
            if (
                isMissingRequiredEnv(value.envs[name] ?? { action: 'untouched' }, required, configured.includes(name))
            ) {
                ctx.addIssue({ code: 'custom', path: ['envs', name], message: 'Required' });
            }
        }
    });
    const form = useForm<z.infer<typeof schema>>({
        defaultValues: { envs: Object.fromEntries(environments.map(({ name }) => [name, { action: 'untouched' }])) },
        resolver: zodResolver(schema),
        mode: 'onChange',
    });
    const envs = useWatch({ control: form.control, name: 'envs' });
    const missing = environments.some(({ name, required }) =>
        isMissingRequiredEnv(envs[name] ?? { action: 'untouched' }, required, configured.includes(name))
    );

    /** Lock validation and submission together so repeated submits cannot queue duplicate releases. */
    async function handleSubmit() {
        if (submitting.current || busy) return;
        submitting.current = true;
        setBusy(true);
        setError(null);
        try {
            await form.handleSubmit(async (value) => {
                // Translate explicit UI intent to the API patch without trimming replacement secrets.
                const patch: Record<string, string | null> = {};
                for (const [name, change] of Object.entries(value.envs)) {
                    if (change.action === 'remove') patch[name] = null;
                    else if (change.action === 'replace') patch[name] = change.value;
                }

                // Submit a patch; the server independently resolves and validates the release again.
                await api(`/api/v1/solutions/${solution.id}/update`, {
                    method: 'POST',
                    timeout: 25000,
                    json: {
                        envs: patch,
                        expected_revision_id: candidate.revision_id,
                    },
                });
                toast({ body: 'Release queued for deployment' });
                await onInvalidate();
            })();
        } catch (failure) {
            // A conflict requires a fresh check, not resubmission of the old candidate.
            if (failure instanceof ApiError && failure.status === 409) {
                toast({ body: failure.message, type: 'error' });
                await onInvalidate();
                return;
            }
            setError(failure instanceof Error ? failure.message : 'Deployment failed');
        } finally {
            submitting.current = false;
            setBusy(false);
        }
    }

    return (
        <Dialog
            isOpen
            title={`Update ${solution.name}`}
            purpose={busy ? 'required' : 'form'}
            width={520}
            maxHeight="calc(100dvh - 2rem)"
            onOpenChange={(open) => {
                if (!open && !busy && !submitting.current) onClose();
            }}
        >
            <form
                id={formId}
                noValidate
                onSubmit={(event) => {
                    event.preventDefault();
                    void handleSubmit();
                }}
            >
                <FormLayout>
                    <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                        <Text type="supporting" color="secondary" wordBreak="break-all">
                            Current {currentLabel === candidateLabel ? candidate.current_image : currentLabel}
                        </Text>
                        <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-secondary" />
                        <Text type="supporting" color="primary" wordBreak="break-all">
                            New {currentLabel === candidateLabel ? candidate.image : candidateLabel}
                        </Text>
                    </Stack>
                    {environments.map(({ name, required, description }) => {
                        const isConfigured = configured.includes(name);
                        return (
                            <Controller
                                control={form.control}
                                key={name}
                                name={`envs.${name}`}
                                render={({ field, fieldState }) => (
                                    <Stack gap={2}>
                                        <TextInput
                                            label={name}
                                            htmlName={field.name}
                                            type="password"
                                            value={field.value.action === 'replace' ? field.value.value : ''}
                                            ref={field.ref}
                                            status={
                                                fieldState.error
                                                    ? { type: 'error', message: fieldState.error.message }
                                                    : undefined
                                            }
                                            isDisabled={busy || field.value.action === 'remove'}
                                            isRequired={required && !isConfigured}
                                            isOptional={!required}
                                            labelTooltip={description ?? undefined}
                                            placeholder={
                                                field.value.action === 'remove'
                                                    ? 'Will be removed'
                                                    : field.value.action === 'untouched' && isConfigured
                                                      ? 'Configured: preserve existing value'
                                                      : (description ?? `Enter ${name}`)
                                            }
                                            onBlur={field.onBlur}
                                            onChange={(value) => field.onChange({ action: 'replace', value })}
                                        />
                                        {field.value.action !== 'untouched' || (isConfigured && !required) ? (
                                            <Stack direction="horizontal" gap={2} wrap="wrap">
                                                {isConfigured && !required && field.value.action !== 'remove' ? (
                                                    <Button
                                                        label={`Remove ${name}`}
                                                        size="sm"
                                                        variant="ghost"
                                                        isDisabled={busy}
                                                        onClick={() => field.onChange({ action: 'remove' })}
                                                    />
                                                ) : null}
                                                {field.value.action !== 'untouched' ? (
                                                    <Button
                                                        label={`Undo ${name} change`}
                                                        size="sm"
                                                        variant="ghost"
                                                        isDisabled={busy}
                                                        onClick={() => field.onChange({ action: 'untouched' })}
                                                    />
                                                ) : null}
                                            </Stack>
                                        ) : null}
                                    </Stack>
                                )}
                            />
                        );
                    })}
                    {error ? <FieldStatus type="error" variant="detached" message={error} /> : null}
                </FormLayout>
            </form>
            <Stack direction="horizontal" gap={2} justify="end" wrap="wrap">
                <Button label="Cancel" variant="ghost" isDisabled={busy} onClick={onClose} />
                <Button
                    form={formId}
                    type="submit"
                    label={busy ? 'Updating...' : 'Update solution'}
                    variant="primary"
                    isLoading={busy}
                    isDisabled={busy || missing}
                />
            </Stack>
        </Dialog>
    );
}
