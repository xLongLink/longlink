import type { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import { Form } from '@/components/ui/Form';
import { useApi } from '@/lib/hooks/use-api';
import { Text } from '@astryxdesign/core/Text';
import { Dialog } from '@/components/ui/Dialog';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { TextInput } from '@/components/ui/TextInput';
import { DeletionDialog } from '@/components/Deletion';
import { Illustration } from '@/components/Illustration';
import { Table, proportional } from '@astryxdesign/core/Table';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

type Registry = z.output<typeof schemas.zRegistryResponse>;

type RegistryAction = { kind: 'create' } | { kind: 'delete'; connection: Registry };

/** Lists organization-owned registry connections without loading credentials. */
export default function Registries({ base, canMaintain }: { base: string; canMaintain: boolean }) {
    const [connections, invalidate] = useApi(`${base}/registries`, schemas.zRegistryResponse.array());
    const [action, setAction] = useState<RegistryAction | null>(null);

    // Retain the settings shell's 260px navigation and show dense, edge-to-edge rows.
    return (
        <>
            <Stack gap={4}>
                <Stack
                    direction="horizontal"
                    justify="between"
                    align="end"
                    wrap="wrap"
                    minHeight="var(--size-element-md)"
                >
                    <Heading level={2} hasCapsize>
                        Private registries
                    </Heading>
                    {canMaintain && (
                        <Button label="Add registry" size="sm" onClick={() => setAction({ kind: 'create' })} />
                    )}
                </Stack>
                <Divider />
                <Table
                    data={connections}
                    idKey="id"
                    density="compact"
                    hasHover
                    columns={[
                        { key: 'host', header: 'Registry', width: proportional(1) },
                        { key: 'username', header: 'Username', width: proportional(1) },
                        ...(canMaintain
                            ? [
                                  {
                                      key: 'id',
                                      header: 'Actions',
                                      align: 'end' as const,
                                      width: proportional(1),
                                      renderCell: (row: Registry) => (
                                          <Button
                                              label="Delete"
                                              size="sm"
                                              variant="destructive"
                                              onClick={() => setAction({ kind: 'delete', connection: row })}
                                          />
                                      ),
                                  },
                              ]
                            : []),
                    ]}
                />
            </Stack>
            {action?.kind === 'create' && (
                <RegistryForm base={base} invalidate={invalidate} onClose={() => setAction(null)} />
            )}
            <DeletionDialog
                confirmation={
                    action?.kind === 'delete'
                        ? {
                              title: 'Delete registry',
                              description: `Delete ${action.connection.username} (${action.connection.host})? Connections used by retained Solution revisions cannot be deleted.`,
                              onDelete: async () => {
                                  // Remove the connection only after server dependency checks succeed.
                                  await api.delete(`${base}/registries/${action.connection.id}`);
                                  await invalidate();
                                  setAction(null);
                              },
                          }
                        : null
                }
                onClose={() => setAction(null)}
            />
        </>
    );
}

/** Collects a token and lets the server resolve its registry account. */
function RegistryForm({
    base,
    invalidate,
    onClose,
}: {
    base: string;
    invalidate: () => Promise<void>;
    onClose: () => void;
}) {
    /** Saves credentials and queues synchronization of Kubernetes pull secrets. */
    async function save(data: FormData) {
        // Submit new credentials without loading saved tokens.
        const json = schemas.zRegistryCreateWritable.parse({ credential: data.get('credential') });
        await api.post(`${base}/registries`, { json });
        await invalidate();
        onClose();
    }

    // Match Solution creation's 960px shell, 560px height, and 640px scrolling content column.
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
                                    <Illustration
                                        src="/images/lock.png"
                                        alt=""
                                        className="size-20 object-contain"
                                        decoding="async"
                                    />
                                    <Stack gap={0}>
                                        <Heading level={2} justify="center">
                                            Connect a registry
                                        </Heading>
                                        <Text as="p" color="secondary" justify="center">
                                            Allow LongLink to pull your private container images
                                        </Text>
                                    </Stack>
                                </Stack>
                                <Form action={save}>
                                    <Stack gap={3}>
                                        <Text as="p">GitHub Container Registry (ghcr.io)</Text>
                                        <Stack className="[&_.astryx-field-label_.astryx-icon]:ml-auto">
                                            <TextInput
                                                label="Personal access token (classic)"
                                                description="Requires the read:packages scope."
                                                type="password"
                                                placeholder="ghp_..."
                                                autoComplete="new-password"
                                                name="credential"
                                                required
                                            />
                                        </Stack>
                                        <Stack direction="horizontal" gap={2} justify="between" wrap="wrap">
                                            <Button label="Cancel" variant="ghost" type="button" onClick={onClose} />
                                            <Button label="Save" variant="primary" type="submit" />
                                        </Stack>
                                    </Stack>
                                </Form>
                            </Stack>
                        </LayoutContent>
                    }
                />
            </Stack>
        </Dialog>
    );
}
