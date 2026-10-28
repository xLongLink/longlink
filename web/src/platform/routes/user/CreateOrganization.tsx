import { api } from '@/lib/api';
import { useState } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { Dialog } from '@/components/ui/Dialog';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Illustration } from '@/components/Illustration';
import { TextInput } from '@astryxdesign/core/TextInput';
import { zOrganizationCreate } from '@/lib/generated/platform-api-v1/zod.gen';
import { Layout, LayoutPanel, LayoutContent } from '@astryxdesign/core/Layout';

/** Owns the creation draft and refreshes memberships after a successful request. */
export default function CreateOrganization({
    onClose,
    invalidate,
}: {
    onClose: () => void;
    invalidate: () => Promise<void>;
}) {
    const [name, setName] = useState('');

    /** Creates the organization and refreshes its memberships. */
    async function createOrganization() {
        if (!name.trim()) return;

        // Close only after creation and the membership refresh succeed.
        await api.post('/api/v1/organizations', { json: zOrganizationCreate.parse({ name: name.trim() }) });
        await invalidate();
        onClose();
    }

    // Keep the split dialog compact and within the dynamic viewport.
    return (
        <Dialog
            isOpen
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Stack height="min(560px, calc(100dvh - var(--spacing-10) * 4))">
                <Layout
                    padding={0}
                    end={
                        <LayoutPanel width="50%" padding={0} className="hidden bg-muted md:flex">
                            <Stack width="100%" height="100%" align="center" justify="center" padding={6}>
                                <Illustration
                                    src="/images/organization-city.png"
                                    alt="Hand-drawn city skyline reflected in water."
                                    className="h-full w-full object-contain"
                                    width={941}
                                    height={1672}
                                    decoding="async"
                                />
                            </Stack>
                        </LayoutPanel>
                    }
                    content={
                        <LayoutContent padding={8}>
                            <Stack
                                height="100%"
                                justify="center"
                                width="max-content"
                                maxWidth="100%"
                                className="mx-auto"
                            >
                                <form action={createOrganization}>
                                    <Stack gap={10}>
                                        <Stack gap={2} align="center">
                                            <Illustration
                                                src="/images/organization.png"
                                                alt=""
                                                className="size-20 object-contain"
                                                width={1254}
                                                height={1254}
                                                decoding="async"
                                            />
                                            <Stack gap={0}>
                                                <Heading level={2} justify="center">
                                                    New organization
                                                </Heading>
                                                <Text as="p" color="secondary" justify="center">
                                                    A place for your workflows and data
                                                </Text>
                                            </Stack>
                                        </Stack>
                                        {/* Let the subtitle size the column, then stretch the controls to match. */}
                                        <Stack gap={4} width={0} className="min-w-full">
                                            <TextInput
                                                label="Name"
                                                value={name}
                                                placeholder="Example LongLink"
                                                isRequired
                                                onChange={setName}
                                                width="100%"
                                            />
                                            <Button
                                                label="Create organization"
                                                variant="primary"
                                                type="submit"
                                                width="100%"
                                                isDisabled={!name.trim()}
                                            />
                                        </Stack>
                                    </Stack>
                                </form>
                            </Stack>
                        </LayoutContent>
                    }
                />
            </Stack>
        </Dialog>
    );
}
