import { api } from '@/lib/api';
import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Dialog } from '@astryxdesign/core/Dialog';
import { Heading } from '@astryxdesign/core/Heading';
import { TextInput } from '@astryxdesign/core/TextInput';
import { zOrganizationCreate } from '@/lib/generated/platform-api-v1/zod.gen';
import { Layout, LayoutPanel, LayoutContent } from '@astryxdesign/core/Layout';

/** Owns the creation draft and refreshes memberships after a successful request. */
export default function CreateOrganization({
    isOpen,
    onOpenChange,
    invalidate,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    invalidate: () => Promise<void>;
}) {
    const [name, setName] = useState('');

    /** Creates the organization and refreshes its memberships. */
    async function createOrganization() {
        if (!name.trim()) return;

        // Close only after creation and the membership refresh succeed.
        await api.post('/api/v1/organizations', { json: zOrganizationCreate.parse({ name: name.trim() }) });
        await invalidate();
        onOpenChange(false);
    }

    // Keep the split dialog compact and within the dynamic viewport.
    return (
        <Dialog
            aria-label="Create organization"
            isOpen={isOpen}
            purpose="info"
            onOpenChange={onOpenChange}
            width={960}
            maxHeight="calc(100dvh - var(--spacing-10) * 4)"
            padding={0}
        >
            <Stack height="min(560px, calc(100dvh - var(--spacing-10) * 4))">
                <Layout
                    padding={0}
                    end={
                        <LayoutPanel width="50%" padding={0} className="hidden bg-muted md:flex">
                            <Stack width="100%" height="100%" align="center" justify="center" padding={6}>
                                <img
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
                                            <Building2 className="size-10 text-secondary" aria-hidden="true" />
                                            <Heading level={2} justify="center">
                                                New organization
                                            </Heading>
                                            <Text as="p" color="secondary" justify="center">
                                                A place for your workflows and data
                                            </Text>
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
