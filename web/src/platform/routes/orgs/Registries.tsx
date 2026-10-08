import type { z } from 'zod';
import { api } from '@/lib/api';
import { useApi } from '@/lib/hooks/use-api';
import { Text } from '@astryxdesign/core/Text';
import { useState, useTransition } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Dialog } from '@astryxdesign/core/Dialog';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { Selector } from '@astryxdesign/core/Selector';
import { TextInput } from '@astryxdesign/core/TextInput';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Table, proportional } from '@astryxdesign/core/Table';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

type Registry = z.output<typeof schemas.zRegistryResponse>;
type RegistryAction = { kind: 'create' } | { kind: 'delete'; connection: Registry };

/** Lists organization-owned registry connections without loading credentials. */
export default function Registries({ base, canMaintain }: { base: string; canMaintain: boolean }) {
    const [connections, invalidate] = useApi<Registry[]>(`${base}/registries`);
    const [action, setAction] = useState<RegistryAction | null>(null);
    const [isDeleting, startDeletion] = useTransition();

    // Retain the settings shell's 260px navigation and show dense, edge-to-edge rows.
    return (
        <>
            <Stack gap={4}>
                <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                    <Stack gap={1}>
                        <Heading level={2}>Connections</Heading>
                        <Text color="secondary">Manage access to private container registries.</Text>
                    </Stack>
                    {canMaintain && <Button label="Add registry" onClick={() => setAction({ kind: 'create' })} />}
                </Stack>
                <Divider />
                <Heading level={3}>Registries</Heading>
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
                                              variant="ghost"
                                              onClick={() => setAction({ kind: 'delete', connection: row })}
                                          />
                                      ),
                                  },
                              ]
                            : []),
                    ]}
                />
                {connections.length === 0 && (
                    <Text color="secondary">No registry connections yet. Public images do not need a connection.</Text>
                )}
            </Stack>
            {action?.kind === 'create' && (
                <RegistryForm base={base} invalidate={invalidate} onClose={() => setAction(null)} />
            )}
            {action?.kind === 'delete' && (
                <AlertDialog
                    isOpen
                    title="Delete registry"
                    description={`Delete ${action.connection.username} (${action.connection.host})? Connections used by retained Solution revisions cannot be deleted.`}
                    actionLabel="Delete"
                    isActionLoading={isDeleting}
                    onOpenChange={(open) => {
                        if (!open) setAction(null);
                    }}
                    onAction={() =>
                        startDeletion(async () => {
                            // Remove the connection only after server dependency checks succeed.
                            await api.delete(`${base}/registries/${action.connection.id}`);
                            await invalidate();
                            setAction(null);
                        })
                    }
                />
            )}
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
    const [credential, setCredential] = useState('');

    /** Saves credentials and queues synchronization of Kubernetes pull secrets. */
    async function save() {
        // Submit new credentials without loading saved tokens.
        const json = schemas.zRegistryCreateWritable.parse({
            provider: 'ghcr',
            credential,
        });
        await api.post(`${base}/registries`, { json });
        await invalidate();
        onClose();
    }

    // Match Solution creation's 960px shell, 560px height, and 640px scrolling content column.
    return (
        <Dialog
            aria-label="Add registry"
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
                                    <img
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
                                <form action={save}>
                                    <Stack gap={3}>
                                        <Selector
                                            label="Provider"
                                            value="ghcr"
                                            options={[{ value: 'ghcr', label: 'GitHub Container Registry (ghcr.io)' }]}
                                            isReadOnly
                                        />
                                        <Stack className="[&_.astryx-field-label_.astryx-icon]:ml-auto">
                                            <TextInput
                                                label="Personal access token (classic)"
                                                labelTooltip="Requires the read:packages scope."
                                                type="password"
                                                placeholder="ghp_..."
                                                autoComplete="new-password"
                                                value={credential}
                                                isRequired
                                                onChange={setCredential}
                                            />
                                        </Stack>
                                        <Stack direction="horizontal" gap={2} justify="between" wrap="wrap">
                                            <Button label="Cancel" variant="ghost" type="button" onClick={onClose} />
                                            <Button
                                                label="Save"
                                                variant="primary"
                                                type="submit"
                                                isDisabled={!credential.trim()}
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
