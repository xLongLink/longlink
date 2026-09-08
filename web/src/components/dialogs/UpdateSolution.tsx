import { useId, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { ArrowRight } from 'lucide-react';
import { Text } from '@astryxdesign/core/Text';
import { useForm } from '@tanstack/react-form';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/lib/hooks/use-toast';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { FieldStatus } from '@astryxdesign/core/FieldStatus';
import type { OrganizationSolutionSummary, SolutionUpdateCheck } from '@/lib/generated/platform-api-v1/types.gen';

const defaultUpdateValues: { envs: Record<string, string | null | undefined> } = { envs: {} };

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
    const path = `/api/v1/solutions/${solution.id}`;
    const formId = useId();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const metadata = candidate.metadata;
    const configured = candidate.configured_envs;

    // Mutable source tags stay the same across updates; compare immutable image identities instead.
    const currentLabel = candidate.current_image.replace(/^.+@(sha256:[a-f0-9]{12})[a-f0-9]*$/, '$1');
    const candidateLabel = candidate.image.replace(/^.+@(sha256:[a-f0-9]{12})[a-f0-9]*$/, '$1');
    const form = useForm({
        defaultValues: defaultUpdateValues,
        onSubmit: async ({ value }) => {
            if (!busy && candidate.available) await deploy(value.envs);
        },
    });

    /** Submit a patch; the server independently resolves and validates the release again. */
    async function deploy(envs: typeof defaultUpdateValues.envs) {
        setBusy(true);
        setError(null);
        try {
            await api(`${path}/update`, {
                method: 'POST',
                timeout: 25000,
                json: {
                    // Undefined fields are omitted; empty strings and explicit removals are preserved.
                    envs,
                    expected_revision_id: candidate.revision_id,
                },
            });
            toast({ body: 'Release queued for deployment' });
            await onInvalidate();
        } catch (failure) {
            // A conflict requires a fresh check, not resubmission of the old candidate.
            if (failure instanceof ApiError && failure.status === 409) {
                toast({ body: failure.message, type: 'error' });
                await onInvalidate();
                return;
            }
            setError(failure instanceof Error ? failure.message : 'Deployment failed');
        } finally {
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
                if (!open && !busy) onClose();
            }}
        >
            <form
                id={formId}
                onSubmit={(event) => {
                    event.preventDefault();
                    void form.handleSubmit();
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
                    {(metadata.environments ?? []).map(({ name, required, description }) => {
                        const isConfigured = configured.includes(name);
                        return (
                            <form.Field
                                key={name}
                                name={`envs.${name}` as `envs.${string}`}
                                validators={{
                                    onChange: ({ value }) =>
                                        required &&
                                        (value === undefined ? !isConfigured : (value ?? '').trim().length === 0)
                                            ? 'Required'
                                            : undefined,
                                }}
                            >
                                {(field) => (
                                    <Stack gap={2}>
                                        <TextInput
                                            label={name}
                                            htmlName={field.name}
                                            type="password"
                                            value={field.state.value ?? ''}
                                            isDisabled={busy || field.state.value === null}
                                            isRequired={required && !isConfigured}
                                            isOptional={!required}
                                            labelTooltip={description ?? undefined}
                                            placeholder={
                                                field.state.value === null
                                                    ? 'Will be removed'
                                                    : field.state.value === undefined && isConfigured
                                                      ? 'Configured: preserve existing value'
                                                      : (description ?? `Enter ${name}`)
                                            }
                                            onBlur={field.handleBlur}
                                            onChange={field.handleChange}
                                        />
                                        {field.state.value !== undefined || (isConfigured && !required) ? (
                                            <Stack direction="horizontal" gap={2} wrap="wrap">
                                                {isConfigured && !required && field.state.value !== null ? (
                                                    <Button
                                                        label={`Remove ${name}`}
                                                        size="sm"
                                                        variant="ghost"
                                                        isDisabled={busy}
                                                        onClick={() => field.handleChange(null)}
                                                    />
                                                ) : null}
                                                {field.state.value !== undefined ? (
                                                    <Button
                                                        label={`Undo ${name} change`}
                                                        size="sm"
                                                        variant="ghost"
                                                        isDisabled={busy}
                                                        onClick={() => field.handleChange(undefined)}
                                                    />
                                                ) : null}
                                            </Stack>
                                        ) : null}
                                    </Stack>
                                )}
                            </form.Field>
                        );
                    })}
                    {error ? <FieldStatus type="error" variant="detached" message={error} /> : null}
                </FormLayout>
            </form>
            <form.Subscribe
                selector={(state) =>
                    (metadata.environments ?? []).some(
                        ({ name, required }) =>
                            required &&
                            (state.values.envs[name] === undefined
                                ? !configured.includes(name)
                                : (state.values.envs[name] ?? '').trim().length === 0)
                    )
                }
            >
                {(missing) => (
                    <Stack direction="horizontal" gap={2} justify="end" wrap="wrap">
                        <Button label="Cancel" variant="ghost" isDisabled={busy} onClick={onClose} />
                        <Button
                            form={formId}
                            type="submit"
                            label={busy ? 'Updating...' : 'Update solution'}
                            variant="primary"
                            isLoading={busy}
                            isDisabled={busy || !candidate.available || missing}
                        />
                    </Stack>
                )}
            </form.Subscribe>
        </Dialog>
    );
}
