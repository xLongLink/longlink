import type { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Form, FormStep } from '@/components/Form';
import { Dialog } from '@astryxdesign/core/Dialog';
import { Heading } from '@astryxdesign/core/Heading';
import { TextInput } from '@/components/ui/TextInput';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

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
    // Retain the inspected metadata and editable values; Form owns navigation and pending state.
    const [metadata, setMetadata] = useState<z.output<typeof schemas.zLongLinkMetadata> | null>(null);
    const [image, setImage] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [envs, setEnvs] = useState<Record<string, string>>({});

    /** Inspects the chosen image before opening its configuration. */
    async function inspectImage() {
        if (!image.trim()) return false;

        // Advance only when the image metadata is valid; reinspection resets image-specific drafts.
        const inspected = schemas.zLongLinkMetadata.parse(
            await api('/api/v1/image', {
                searchParams: { image: image.trim(), organization_id: organizationId },
            }).json()
        );

        setImage(image.trim());
        setDescription(inspected.description || '');
        setEnvs({});
        setMetadata(inspected);
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

    // Keep the existing dialog frame and content width while sharing all wizard mechanics.
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
            <Form
                height="min(560px, calc(100dvh - var(--spacing-10) * 4))"
                action={createSolution}
                submitLabel="Create"
                onCancel={onClose}
                nextLabel={(step) => (step === 0 ? 'Inspect' : 'Next')}
                onNext={(step) => (step === 0 ? inspectImage() : Boolean(name.trim()))}
            >
                <FormStep label="Image">
                    <Stack gap={8}>
                        <Stack gap={3} align="center">
                            <img
                                src="/images/solution.png"
                                alt=""
                                className="size-20 object-contain"
                                width={272}
                                height={279}
                                decoding="async"
                            />
                            <Stack gap={0}>
                                <Heading level={2} justify="center">
                                    Choose a Solution image
                                </Heading>
                                <Text as="p" color="secondary" justify="center">
                                    Start with a container image or try the sample Solution
                                </Text>
                            </Stack>
                        </Stack>
                        <Stack className="relative">
                            <TextInput
                                label="Image"
                                value={image}
                                placeholder="ghcr.io/longlink/dashboard:latest"
                                required
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
                    </Stack>
                </FormStep>
                <FormStep label="Metadata">
                    <Stack gap={8}>
                        <Stack gap={3} align="center">
                            <img
                                src="/images/nametag.png"
                                alt=""
                                className="size-20 object-contain"
                                width={1448}
                                height={1086}
                                decoding="async"
                            />
                            <Stack gap={0}>
                                <Heading level={2} justify="center">
                                    Make it yours
                                </Heading>
                                <Text as="p" color="secondary" justify="center">
                                    Give your Solution a name and description
                                </Text>
                            </Stack>
                        </Stack>
                        <Stack gap={3}>
                            <TextInput label="Name" value={name} required onChange={setName} />
                            <TextInput
                                label="Description"
                                value={description}
                                placeholder="Dashboard solution"
                                onChange={setDescription}
                            />
                        </Stack>
                    </Stack>
                </FormStep>
                <FormStep label="Environment">
                    <Stack gap={8}>
                        <Stack gap={3} align="center">
                            <img
                                src="/images/lock.png"
                                alt=""
                                className="size-20 object-contain"
                                width={1327}
                                height={1186}
                                decoding="async"
                            />
                            <Stack gap={0}>
                                <Heading level={2} justify="center">
                                    Configure your environment
                                </Heading>
                                <Text as="p" color="secondary" justify="center">
                                    Set the values your Solution needs to run
                                </Text>
                            </Stack>
                        </Stack>
                        <Stack gap={3}>
                            {(metadata?.environments ?? []).map((environment) => (
                                <TextInput
                                    key={environment.name}
                                    label={environment.name}
                                    value={envs[environment.name] ?? ''}
                                    placeholder={environment.description ?? undefined}
                                    required={environment.required}
                                    onChange={(value) => setEnvs({ ...envs, [environment.name]: value })}
                                />
                            ))}
                        </Stack>
                    </Stack>
                </FormStep>
            </Form>
        </Dialog>
    );
}
