import { api } from '@/lib/api';
import { useState } from 'react';
import { Form } from '@/components/ui/Form';
import { Text } from '@astryxdesign/core/Text';
import { Dialog } from '@/components/ui/Dialog';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { Step, Stepper } from '@/components/ui/Stepper';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Stack, StackItem } from '@astryxdesign/core/Stack';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

export type Update = {
    // Scope inspection and drafts to one freshly opened review attempt.
    key: string;
    item: { id: string; name: string };
};

type DeploymentReviewProps = {
    update: Update;
    onSuccess: () => void | Promise<void>;
    onClose: () => void;
};

/** Abbreviates digest references for release comparison while preserving tag-only images. */
function imageDigest(image: string) {
    // Keep the first twelve digest characters without changing authoritative image values.
    return image.match(/@(sha256:[a-f0-9]{12})[a-f0-9]*$/)?.[1] ?? image;
}

/** Owns fresh inspection, the deployment draft, and submission for one review attempt. */
export default function DeploymentReview({ update, onSuccess, onClose }: DeploymentReviewProps) {
    const [envs, setEnvs] = useState<Record<string, { value?: string; removed?: boolean }>>({});

    // Keep inspection attempt-local, cancel on unmount, and never refresh beneath an edited draft.
    const path = `/api/v1/solutions/${update.item.id}/update`;

    const {
        data: candidate,
        isPending,
        refetch,
    } = useQuery({
        queryKey: ['api', path, update.key],
        queryFn: ({ signal }) => api(path, { signal }).json(schemas.zSolutionUpdateCheck),
        gcTime: 0,
        staleTime: Infinity,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
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

        await api.post(`/api/v1/solutions/${update.item.id}/update`, {
            json: schemas.zSolutionPatch.parse({
                envs: patchEnvs,
                expected_revision_id: candidate.revision_id,
            }),
        });
        await onSuccess();
    }

    // Share wizard navigation while retaining revision fencing and configured-secret semantics.
    return (
        <Dialog
            isOpen
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            {!candidate ? (
                <Stack height="min(560px, calc(100dvh - var(--spacing-10) * 4))">
                    <Layout
                        padding={0}
                        content={
                            <LayoutContent padding={8}>
                                <Stack gap={4} align="center" justify="center" minHeight="100%">
                                    <Heading level={2}>Update {update.item.name}</Heading>
                                    <Text as="p" role="status">
                                        {isPending ? 'Checking for updates…' : 'Could not check for updates.'}
                                    </Text>
                                    <Stack direction="horizontal" gap={2}>
                                        <Button label="Cancel" variant="ghost" onClick={onClose} />
                                        {!isPending && <Button label="Retry" onClick={() => void refetch()} />}
                                    </Stack>
                                </Stack>
                            </LayoutContent>
                        }
                    />
                </Stack>
            ) : (
                <Form action={updateSolution} submitDisabled={missingRequired || !hasChanges}>
                    <Stepper
                        variant="wizard"
                        height="min(560px, calc(100dvh - var(--spacing-10) * 4))"
                        onCancel={onClose}
                    >
                        <Step label="Image">
                            <Stack gap={4}>
                                <Stack gap={3} align="center">
                                    <RefreshCw className="size-20 text-secondary" aria-hidden="true" />
                                    <Heading level={2} justify="center">
                                        Update {update.item.name}
                                    </Heading>
                                </Stack>
                                <Stack direction="horizontal" gap={4} align="center">
                                    <StackItem size="fill">
                                        <Stack padding={3} className="rounded-lg bg-muted">
                                            <Text
                                                type="code"
                                                color="secondary"
                                                justify="center"
                                                display="block"
                                                className="break-all"
                                            >
                                                {candidate.current_version || imageDigest(candidate.current_image)}
                                            </Text>
                                        </Stack>
                                    </StackItem>
                                    <ArrowRight className="size-5 shrink-0 text-secondary" aria-hidden="true" />
                                    <StackItem size="fill">
                                        <Stack padding={3} className="rounded-lg bg-muted">
                                            <Text type="code" justify="center" display="block" className="break-all">
                                                {candidate.metadata.version || imageDigest(candidate.metadata.image)}
                                            </Text>
                                        </Stack>
                                    </StackItem>
                                </Stack>
                            </Stack>
                        </Step>
                        <Step label="Environment">
                            <Stack gap={4}>
                                <Stack gap={3} align="center">
                                    <RefreshCw className="size-20 text-secondary" aria-hidden="true" />
                                    <Heading level={2} justify="center">
                                        Configure your environment
                                    </Heading>
                                </Stack>
                                {!candidate.metadata.environments?.length && (
                                    <Text color="secondary">This solution does not require environment variables.</Text>
                                )}
                                {(candidate.metadata.environments ?? []).map((environment) => {
                                    // Resolve the configured secret and its local draft without exposing its value.
                                    const configured = candidate.configured_envs.includes(environment.name);

                                    const draft = envs[environment.name];
                                    const isRemoved = draft?.removed === true;

                                    // Configured secrets remain hidden; blank untouched inputs preserve them.
                                    return (
                                        <Stack key={environment.name} gap={2}>
                                            <TextInput
                                                label={environment.name}
                                                labelTooltip={environment.description ?? undefined}
                                                type="password"
                                                value={draft?.value ?? ''}
                                                isDisabled={isRemoved}
                                                isOptional={!environment.required}
                                                isRequired={environment.required && (!configured || isRemoved)}
                                                placeholder={
                                                    isRemoved
                                                        ? 'Will be removed'
                                                        : configured
                                                          ? 'Configured: preserve existing value'
                                                          : environment.description || 'Enter value'
                                                }
                                                onChange={(value) =>
                                                    setEnvs((current) => ({
                                                        ...current,
                                                        [environment.name]: {
                                                            ...current[environment.name],
                                                            value,
                                                        },
                                                    }))
                                                }
                                            />
                                            {configured && !environment.required && (
                                                <CheckboxInput
                                                    label={`Remove ${environment.name}`}
                                                    value={isRemoved}
                                                    onChange={(removed) =>
                                                        setEnvs((current) => ({
                                                            ...current,
                                                            [environment.name]: {
                                                                ...current[environment.name],
                                                                removed,
                                                            },
                                                        }))
                                                    }
                                                />
                                            )}
                                        </Stack>
                                    );
                                })}
                            </Stack>
                            <Button
                                type="submit"
                                label="Update solution"
                                variant="primary"
                                isDisabled={missingRequired || !hasChanges}
                            />
                        </Step>
                    </Stepper>
                </Form>
            )}
        </Dialog>
    );
}
