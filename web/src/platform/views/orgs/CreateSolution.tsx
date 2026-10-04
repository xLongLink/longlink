import type { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import { useAction } from '@/lib/hooks/use-api';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { useQueryClient } from '@tanstack/react-query';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Step, Stepper } from '@astryxdesign/core/Stepper';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

type Stage =
    | { step: 0 }
    | { step: 1; metadata: z.output<typeof schemas.zLongLinkMetadata> }
    | { step: 2; metadata: z.output<typeof schemas.zLongLinkMetadata> };

/** Owns one creation attempt, shared by the organization list and settings pages. */
export default function CreateSolution({ organizationId, onClose }: { organizationId: string; onClose: () => void }) {
    const [stage, setStage] = useState<Stage>({ step: 0 });
    const [image, setImage] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [envs, setEnvs] = useState<Record<string, string>>({});
    const client = useQueryClient();
    const action = useAction();

    return (
        <Dialog
            isOpen
            purpose="form"
            onOpenChange={(open) => {
                if (!open && !action.isPending) onClose();
            }}
        >
            <DialogHeader
                title="Create solution"
                onOpenChange={() => {
                    if (!action.isPending) onClose();
                }}
            />
            <Stepper
                activeStep={stage.step}
                indicatorPosition="on-track"
                label="Solution creation"
                orientation="vertical"
            >
                <Step step={0} label="Image" description="Inspect the solution image.">
                    {stage.step === 0 && (
                        <Stack
                            gap={3}
                            as="form"
                            onSubmit={(event) => {
                                event.preventDefault();
                                if (action.isPending || !image.trim()) return;

                                // Inspect the current image and advance only when its metadata is valid.
                                action.mutate(async () => {
                                    const inspected = schemas.zLongLinkMetadata.parse(
                                        await api('/api/v1/image', { searchParams: { image: image.trim() } }).json()
                                    );
                                    setImage(image.trim());
                                    setDescription(inspected.description || '');
                                    setEnvs({});
                                    setStage({ step: 1, metadata: inspected });
                                });
                            }}
                        >
                            <TextInput
                                label="Image"
                                value={image}
                                placeholder="ghcr.io/longlink/dashboard:latest"
                                isRequired
                                onChange={setImage}
                            />
                            <Stack direction="horizontal" gap={2} justify="between" wrap="wrap">
                                <Button
                                    label="Use sample Image"
                                    variant="ghost"
                                    isDisabled={action.isPending}
                                    onClick={() => setImage('ghcr.io/xlonglink/sample:latest')}
                                />
                                <Stack direction="horizontal" gap={2}>
                                    <Button
                                        label="Cancel"
                                        variant="ghost"
                                        isDisabled={action.isPending}
                                        onClick={onClose}
                                    />
                                    <Button
                                        label="Inspect image"
                                        variant="primary"
                                        type="submit"
                                        isDisabled={!image.trim()}
                                        isLoading={action.isPending}
                                    />
                                </Stack>
                            </Stack>
                        </Stack>
                    )}
                </Step>
                <Step step={1} label="Metadata" description="Name and describe the solution.">
                    {stage.step === 1 && (
                        <Stack
                            gap={3}
                            as="form"
                            onSubmit={(event) => {
                                event.preventDefault();
                                if (name.trim()) setStage({ step: 2, metadata: stage.metadata });
                            }}
                        >
                            <TextInput label="Name" value={name} isRequired onChange={setName} />
                            <TextInput
                                label="Description"
                                value={description}
                                placeholder="Dashboard solution"
                                onChange={setDescription}
                            />
                            <Stack direction="horizontal" gap={2} justify="between" wrap="wrap">
                                <Button label="Back" variant="ghost" onClick={() => setStage({ step: 0 })} />
                                <Stack direction="horizontal" gap={2}>
                                    <Button label="Cancel" variant="ghost" onClick={onClose} />
                                    <Button label="Next" variant="primary" type="submit" isDisabled={!name.trim()} />
                                </Stack>
                            </Stack>
                        </Stack>
                    )}
                </Step>
                <Step step={2} label="Environment" description="Configure environment values.">
                    {stage.step === 2 && (
                        <Stack
                            gap={3}
                            as="form"
                            onSubmit={(event) => {
                                event.preventDefault();
                                if (action.isPending) return;

                                // Omit blank optional environments while preserving configured values.
                                action.mutate(async () => {
                                    const json = schemas.zSolutionCreate.parse({
                                        description: description || null,
                                        envs: Object.fromEntries(
                                            Object.entries(envs).filter(([, value]) => value.length > 0)
                                        ),
                                        image,
                                        name: name.trim(),
                                    });
                                    await api.post(`/api/v1/organizations/${organizationId}/solutions`, { json });
                                    await client.invalidateQueries({
                                        queryKey: ['api', `/api/v1/organizations/${organizationId}/solutions`],
                                        exact: true,
                                    });
                                    onClose();
                                });
                            }}
                        >
                            {(stage.metadata.environments ?? []).map((environment) => (
                                <TextInput
                                    key={environment.name}
                                    label={environment.name}
                                    value={Object.hasOwn(envs, environment.name) ? envs[environment.name] : ''}
                                    placeholder={environment.description ?? undefined}
                                    isRequired={environment.required}
                                    onChange={(value) => setEnvs({ ...envs, [environment.name]: value })}
                                />
                            ))}
                            <Stack direction="horizontal" gap={2} justify="between" wrap="wrap">
                                <Button
                                    label="Back"
                                    variant="ghost"
                                    isDisabled={action.isPending}
                                    onClick={() => setStage({ step: 1, metadata: stage.metadata })}
                                />
                                <Stack direction="horizontal" gap={2}>
                                    <Button
                                        label="Cancel"
                                        variant="ghost"
                                        isDisabled={action.isPending}
                                        onClick={onClose}
                                    />
                                    <Button
                                        label="Create"
                                        variant="primary"
                                        type="submit"
                                        isLoading={action.isPending}
                                    />
                                </Stack>
                            </Stack>
                        </Stack>
                    )}
                </Step>
            </Stepper>
        </Dialog>
    );
}
