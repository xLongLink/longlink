import { api } from '@/lib/api';
import { useState } from 'react';
import { Form } from '@/components/custom/form';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { Step, Wizard } from '@/components/custom/wizard';
import { ViewDialog } from '@/components/custom/view-dialog';
import { CheckboxInput } from '@/components/custom/checkbox-input';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeTextInput } from '@/components/custom/native-text-input';
import { NativeButton as Button } from '@/components/custom/native-button';
import { NativeHeading as Heading } from '@/components/custom/native-heading';

type DeploymentReviewProps = {
    item: { id: string; name: string };
    onSuccess: () => void | Promise<void>;
    onClose: () => void;
};

/** Abbreviates digest references for release comparison while preserving tag-only images. */
function imageDigest(image: string) {
    // Keep the first twelve digest characters without changing authoritative image values.
    return image.match(/@(sha256:[a-f0-9]{12})[a-f0-9]*$/)?.[1] ?? image;
}

/** Owns fresh inspection, the deployment draft, and submission for one review attempt. */
export default function DeploymentReview({ item, onSuccess, onClose }: DeploymentReviewProps) {
    // Scope inspection and drafts to one freshly opened review attempt.
    const [attemptId] = useState(() => crypto.randomUUID());
    const [envs, setEnvs] = useState<Record<string, { value?: string; removed?: boolean }>>({});

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

    // Share wizard navigation while retaining revision fencing and configured-secret semantics.
    return (
        <ViewDialog
            isOpen
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            {!candidate ? (
                <div className="h-[min(560px,calc(100dvh-var(--spacing-10)*4))] min-h-0 min-w-0 overflow-hidden">
                    <div className="box-border h-full min-h-0 min-w-0 flex-1 overflow-auto p-8">
                        <Stack gap={4} align="center" justify="center" minHeight="100%">
                            <Heading level={2}>Update {item.name}</Heading>
                            <Text as="p" role="status">
                                {isPending ? 'Checking for updates…' : 'Could not check for updates.'}
                            </Text>
                            <Stack direction="horizontal" gap={2}>
                                <Button label="Cancel" variant="ghost" onClick={onClose} />
                                {!isPending && <Button label="Retry" onClick={() => void refetch()} />}
                            </Stack>
                        </Stack>
                    </div>
                </div>
            ) : (
                <Form action={updateSolution} submitDisabled={missingRequired || !hasChanges}>
                    <Wizard
                        height="min(560px, calc(100dvh - var(--spacing-10) * 4))"
                        backVariant="ghost"
                        finalAction={
                            <Button
                                type="submit"
                                label="Update solution"
                                variant="default"
                                isDisabled={missingRequired || !hasChanges}
                            />
                        }
                    >
                        <Step label="Image">
                            <Stack gap={4}>
                                <Stack gap={3} align="center">
                                    <RefreshCw className="size-20 text-muted-foreground" aria-hidden="true" />
                                    <Heading level={2} justify="center">
                                        Update {item.name}
                                    </Heading>
                                </Stack>
                                <Stack direction="horizontal" gap={4} align="center">
                                    <div className="min-h-0 min-w-0 grow">
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
                                    </div>
                                    <ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                                    <div className="min-h-0 min-w-0 grow">
                                        <Stack padding={3} className="rounded-lg bg-muted">
                                            <Text type="code" justify="center" display="block" className="break-all">
                                                {candidate.metadata.version || imageDigest(candidate.metadata.image)}
                                            </Text>
                                        </Stack>
                                    </div>
                                </Stack>
                            </Stack>
                        </Step>
                        <Step label="Environment">
                            <Stack gap={4}>
                                <Stack gap={3} align="center">
                                    <RefreshCw className="size-20 text-muted-foreground" aria-hidden="true" />
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
                                            <NativeTextInput
                                                label={environment.name}
                                                description={environment.description ?? undefined}
                                                type="password"
                                                value={draft?.value ?? ''}
                                                disabled={isRemoved}
                                                required={environment.required && (!configured || isRemoved)}
                                                placeholder={
                                                    isRemoved
                                                        ? 'Will be removed'
                                                        : configured
                                                          ? 'Configured: preserve existing value'
                                                          : environment.description || 'Enter value'
                                                }
                                                onChange={(event) => {
                                                    const value = event.target.value;

                                                    setEnvs((current) => ({
                                                        ...current,
                                                        [environment.name]: { ...current[environment.name], value }
                                                    }));
                                                }}
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
                                                                removed
                                                            }
                                                        }))
                                                    }
                                                />
                                            )}
                                        </Stack>
                                    );
                                })}
                            </Stack>
                        </Step>
                    </Wizard>
                </Form>
            )}
        </ViewDialog>
    );
}
