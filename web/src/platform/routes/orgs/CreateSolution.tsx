import type { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Dialog } from '@astryxdesign/core/Dialog';
import { Heading } from '@astryxdesign/core/Heading';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Step, Stepper } from '@astryxdesign/core/Stepper';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Layout, LayoutHeader, LayoutContent } from '@astryxdesign/core/Layout';

type Stage = { step: 0 } | { step: 1 | 2; metadata: z.output<typeof schemas.zLongLinkMetadata> };

/** Owns one creation attempt, shared by the organization list and settings pages. */
export default function CreateSolution({
    organizationId,
    invalidate,
    onClose,
}: {
    organizationId: string;
    invalidate: () => Promise<void>;
    onClose: () => void;
}) {
    const [stage, setStage] = useState<Stage>({ step: 0 });
    const [image, setImage] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [envs, setEnvs] = useState<Record<string, string>>({});

    /** Inspects the chosen image before opening its configuration. */
    async function inspectImage() {
        if (!image.trim()) return;

        // Advance only when the image metadata is valid.
        const inspected = schemas.zLongLinkMetadata.parse(
            await api('/api/v1/image', {
                searchParams: {
                    image: image.trim(),
                    organization_id: organizationId,
                },
            }).json()
        );

        setImage(image.trim());
        setDescription(inspected.description || '');
        setEnvs({});
        setStage({ step: 1, metadata: inspected });
    }

    /** Creates the configured Solution and refreshes its organization. */
    async function createSolution() {
        // Omit blank optional environments and refresh only after creation succeeds.
        const json = schemas.zSolutionCreate.parse({
            description: description || null,
            envs: Object.fromEntries(Object.entries(envs).filter(([, value]) => value.length > 0)),
            image,
            name: name.trim(),
        });

        await api.post(`/api/v1/organizations/${organizationId}/solutions`, { json });
        await invalidate();
        onClose();
    }

    // Keep progress above the active step and allow longer configuration forms to scroll.
    return (
        <Dialog
            aria-label="Create solution"
            isOpen
            purpose="info"
            width={960}
            maxHeight="calc(100dvh - var(--spacing-10) * 4)"
            padding={0}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Stack height="min(560px, calc(100dvh - var(--spacing-10) * 4))">
                <Layout
                    padding={0}
                    header={
                        <LayoutHeader hasDivider={false}>
                            <Stack paddingInline={8} paddingBlock={4}>
                                <Stepper
                                    activeStep={stage.step}
                                    indicatorPosition="separated"
                                    label="Solution creation"
                                    orientation="horizontal"
                                    density="balanced"
                                >
                                    <Step
                                        step={0}
                                        label="Image"
                                        status={stage.step > 0 ? 'success' : undefined}
                                        indicator="auto"
                                    />
                                    <Step
                                        step={1}
                                        label="Metadata"
                                        status={stage.step > 1 ? 'success' : undefined}
                                        indicator="auto"
                                    />
                                    <Step step={2} label="Environment" indicator="auto" />
                                </Stepper>
                            </Stack>
                        </LayoutHeader>
                    }
                    content={
                        <LayoutContent padding={8}>
                            <Stack
                                gap={8}
                                minHeight="100%"
                                justify="center"
                                width="100%"
                                maxWidth={640}
                                className="mx-auto"
                            >
                                <Stack gap={3} align="center">
                                    {stage.step === 0 ? (
                                        <img
                                            src="/images/solution.png"
                                            alt=""
                                            className="size-20 object-contain"
                                            width={272}
                                            height={279}
                                            decoding="async"
                                        />
                                    ) : stage.step === 1 ? (
                                        <img
                                            src="/images/nametag.png"
                                            alt=""
                                            className="size-20 object-contain"
                                            width={1448}
                                            height={1086}
                                            decoding="async"
                                        />
                                    ) : (
                                        <img
                                            src="/images/lock.png"
                                            alt=""
                                            className="size-20 object-contain"
                                            width={1327}
                                            height={1186}
                                            decoding="async"
                                        />
                                    )}
                                    <Stack gap={0}>
                                        <Heading level={2} justify="center">
                                            {
                                                [
                                                    'Choose a Solution image',
                                                    'Make it yours',
                                                    'Configure your environment',
                                                ][stage.step]
                                            }
                                        </Heading>
                                        <Text as="p" color="secondary" justify="center">
                                            {
                                                [
                                                    'Start with a container image or try the sample Solution',
                                                    'Give your Solution a name and description',
                                                    'Set the values your Solution needs to run',
                                                ][stage.step]
                                            }
                                        </Text>
                                    </Stack>
                                </Stack>
                                {stage.step === 0 && (
                                    <form action={inspectImage}>
                                        <Stack gap={3}>
                                            <Stack className="relative">
                                                <TextInput
                                                    label="Image"
                                                    value={image}
                                                    placeholder="ghcr.io/longlink/dashboard:latest"
                                                    isRequired
                                                    onChange={setImage}
                                                />
                                                <Link
                                                    className="absolute top-0 right-0"
                                                    size="base"
                                                    color="secondary"
                                                    hasUnderline
                                                    onClick={() => setImage('ghcr.io/xlonglink/sample:latest')}
                                                >
                                                    Use sample image
                                                </Link>
                                            </Stack>
                                            <Stack direction="horizontal" gap={2} justify="between" wrap="wrap">
                                                <Button
                                                    label="Cancel"
                                                    variant="ghost"
                                                    type="button"
                                                    onClick={onClose}
                                                />
                                                <Stack direction="horizontal" gap={2}>
                                                    <Button
                                                        label="Inspect"
                                                        variant="primary"
                                                        type="submit"
                                                        isDisabled={!image.trim()}
                                                    />
                                                </Stack>
                                            </Stack>
                                        </Stack>
                                    </form>
                                )}
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
                                            <Button
                                                label="Back"
                                                variant="ghost"
                                                onClick={() => setStage({ step: 0 })}
                                            />
                                            <Stack direction="horizontal" gap={2}>
                                                <Button
                                                    label="Next"
                                                    variant="primary"
                                                    type="submit"
                                                    isDisabled={!name.trim()}
                                                />
                                            </Stack>
                                        </Stack>
                                    </Stack>
                                )}
                                {stage.step === 2 && (
                                    <form action={createSolution}>
                                        <Stack gap={3}>
                                            {(stage.metadata.environments ?? []).map((environment) => (
                                                <TextInput
                                                    key={environment.name}
                                                    label={environment.name}
                                                    value={
                                                        Object.hasOwn(envs, environment.name)
                                                            ? envs[environment.name]
                                                            : ''
                                                    }
                                                    placeholder={environment.description ?? undefined}
                                                    isRequired={environment.required}
                                                    onChange={(value) =>
                                                        setEnvs({ ...envs, [environment.name]: value })
                                                    }
                                                />
                                            ))}
                                            <Stack direction="horizontal" gap={2} justify="between" wrap="wrap">
                                                <Button
                                                    label="Back"
                                                    variant="ghost"
                                                    onClick={() => setStage({ step: 1, metadata: stage.metadata })}
                                                />
                                                <Stack direction="horizontal" gap={2}>
                                                    <Button label="Create" variant="primary" type="submit" />
                                                </Stack>
                                            </Stack>
                                        </Stack>
                                    </form>
                                )}
                            </Stack>
                        </LayoutContent>
                    }
                />
            </Stack>
        </Dialog>
    );
}
