import { cn } from 'cn';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import { Form } from '@/components/custom/form';
import { Dialog } from '@/components/custom/dialog';
import { Button } from '@/components/shadcn/button';
import { Illustration } from '@/components/illustration';
import { Step, Wizard } from '@/components/custom/wizard';
import { TextInput } from '@/components/custom/text-input';
import { buttonVariants } from '@/components/shadcn/button';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeHeading as Heading } from '@/components/custom/native-heading';

/** Owns one creation attempt, shared by the organization list and settings pages. */
export default function CreateSolution({
    organizationId,
    onSuccess,
    onClose
}: {
    organizationId: string;
    onSuccess: () => void | Promise<void>;
    onClose: () => void;
}) {
    // Retain image metadata while named controls own drafts and Wizard owns navigation.
    const [image, setImage] = useState('');

    const [inspection, setInspection] = useState<{
        metadata: z.output<typeof schemas.zLongLinkMetadata>;
        generation: number;
    }>();

    /** Inspects the chosen image before opening its configuration. */
    async function inspectImage() {
        if (!image.trim()) return false;

        // Advance only when the image metadata is valid; reinspection resets image-specific drafts.
        const inspected = schemas.zLongLinkMetadata.parse(
            await api(`/api/v1/organizations/${organizationId}/image`, { searchParams: { image: image.trim() } }).json()
        );

        setImage(image.trim());
        setInspection((previous) => ({ metadata: inspected, generation: (previous?.generation ?? 0) + 1 }));
    }

    /** Creates the configured Solution before completing the parent-owned success workflow. */
    async function createSolution(data: FormData) {
        // Parse the form-owned name before applying Solution request constraints.
        const name = z.string().trim().parse(data.get('name'));

        // Omit blank optional environments and notify the parent only after creation succeeds.
        const json = schemas.zSolutionCreate.parse({
            description: z.string().parse(data.get('description')) || null,
            envs: Object.fromEntries(
                (inspection?.metadata.environments ?? [])
                    .map(({ name }) => [name, z.string().parse(data.get(`envs.${name}`))] as const)
                    .filter(([, value]) => value !== '')
            ),
            image,
            name
        });

        await api.post(`/api/v1/organizations/${organizationId}/solutions`, { json });
        await onSuccess();
    }

    // Keep the existing dialog frame and content width while sharing all wizard mechanics.
    return (
        <Dialog
            isOpen
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Form action={createSolution}>
                <Wizard
                    height="min(560px, calc(100dvh - var(--spacing) * 40))"
                    onCancel={onClose}
                    next={(step) => (step === 0 ? { label: 'Inspect', action: inspectImage } : undefined)}
                >
                    <Step label="Image">
                        <Stack gap={8}>
                            <Stack gap={3} align="center">
                                <Illustration
                                    src="/images/solution.png"
                                    alt=""
                                    className="size-20 object-contain"
                                    width={272}
                                    height={279}
                                    decoding="async"
                                />
                                <Stack gap={0}>
                                    <Heading level={2} className="text-center">
                                        Choose a Solution image
                                    </Heading>
                                    <Text as="p" className="text-muted-foreground text-center">
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
                                <button
                                    type="button"
                                    className={cn(
                                        buttonVariants({ variant: 'link', size: null }),
                                        'absolute top-0 right-0 underline'
                                    )}
                                    onClick={() => setImage('ghcr.io/xlonglink/sample:latest')}
                                >
                                    <Text className="text-muted-foreground text-base">Use sample image</Text>
                                </button>
                            </Stack>
                        </Stack>
                    </Step>
                    <Step label="Metadata">
                        <Stack gap={8}>
                            <Stack gap={3} align="center">
                                <Illustration
                                    src="/images/nametag.png"
                                    alt=""
                                    className="size-20 object-contain"
                                    width={1448}
                                    height={1086}
                                    decoding="async"
                                />
                                <Stack gap={0}>
                                    <Heading level={2} className="text-center">
                                        Make it yours
                                    </Heading>
                                    <Text as="p" className="text-muted-foreground text-center">
                                        Give your Solution a name and description
                                    </Text>
                                </Stack>
                            </Stack>
                            <Stack gap={3}>
                                <TextInput label="Name" name="name" required />
                                <TextInput
                                    key={inspection?.generation}
                                    label="Description"
                                    name="description"
                                    defaultValue={inspection?.metadata.description ?? ''}
                                    placeholder="Dashboard solution"
                                />
                            </Stack>
                        </Stack>
                    </Step>
                    <Step label="Environment">
                        <Stack gap={8}>
                            <Stack gap={3} align="center">
                                <Illustration
                                    src="/images/lock.png"
                                    alt=""
                                    className="size-20 object-contain"
                                    width={1327}
                                    height={1186}
                                    decoding="async"
                                />
                                <Stack gap={0}>
                                    <Heading level={2} className="text-center">
                                        Configure your environment
                                    </Heading>
                                    <Text as="p" className="text-muted-foreground text-center">
                                        Set the values your Solution needs to run
                                    </Text>
                                </Stack>
                            </Stack>
                            <Stack key={inspection?.generation} gap={3}>
                                {(inspection?.metadata.environments ?? []).map((environment) => (
                                    <TextInput
                                        key={environment.name}
                                        label={environment.name}
                                        name={`envs.${environment.name}`}
                                        placeholder={environment.description ?? undefined}
                                        required={environment.required}
                                    />
                                ))}
                            </Stack>
                        </Stack>
                        <Button type="submit" variant="default">
                            Create
                        </Button>
                    </Step>
                </Wizard>
            </Form>
        </Dialog>
    );
}
