import type { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import { FormDialog } from './FormDialog';
import { useApi } from '@/lib/hooks/use-api';
import { Form } from '@/components/custom/Form';
import { Divider } from '@/components/custom/Divider';
import { DeletionDialog } from '@/components/Deletion';
import { Illustration } from '@/components/Illustration';
import { TextInput } from '@/components/custom/TextInput';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeText as Text } from '@/components/custom/NativeText';
import { NativeStack as Stack } from '@/components/custom/NativeStack';
import { DataTable, proportional } from '@/components/custom/DataTable';
import { NativeButton as Button } from '@/components/custom/NativeButton';
import { NativeHeading as Heading } from '@/components/custom/NativeHeading';

type Registry = z.output<typeof schemas.zRegistryResponse>;

type RegistryAction = { kind: 'create' } | { kind: 'delete'; connection: Registry };

/** Lists organization-owned registry connections without loading credentials. */
export default function Registries({ base, canMaintain }: { base: string; canMaintain: boolean }) {
    const [connections, invalidate] = useApi(`${base}/registries`, schemas.zRegistryResponse.array());
    const [action, setAction] = useState<RegistryAction | null>(null);

    function closeAction() {
        // Leave replacement dialogs open when an older operation finishes.
        setAction((current) => (current === action ? null : current));
    }

    async function onSuccess() {
        // Keep the active dialog and its draft when refreshing fails.
        await invalidate();
        closeAction();
    }

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
                        <Button
                            label="Add registry"
                            size="sm"
                            onClick={() =>
                                setAction((current) => (current?.kind === 'create' ? current : { kind: 'create' }))
                            }
                        />
                    )}
                </Stack>
                <Divider />
                <DataTable
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
                                      )
                                  }
                              ]
                            : [])
                    ]}
                />
            </Stack>
            {action?.kind === 'create' && <RegistryForm base={base} onSuccess={onSuccess} onClose={closeAction} />}
            <DeletionDialog
                confirmation={
                    action?.kind === 'delete'
                        ? {
                              title: 'Delete registry',
                              description: `Delete ${action.connection.username} (${action.connection.host})? Connections used by retained Solution revisions cannot be deleted.`,
                              onDelete: async () => {
                                  // Remove the connection only after server dependency checks succeed.
                                  await api.delete(`${base}/registries/${action.connection.id}`);
                                  await onSuccess();
                              }
                          }
                        : null
                }
                onClose={closeAction}
            />
        </>
    );
}

/** Collects a token and lets the server resolve its registry account. */
function RegistryForm({
    base,
    onSuccess,
    onClose
}: {
    base: string;
    onSuccess: () => Promise<void>;
    onClose: () => void;
}) {
    /** Saves credentials and queues synchronization of Kubernetes pull secrets. */
    async function save(data: FormData) {
        // Submit new credentials without loading saved tokens.
        const json = schemas.zRegistryCreateWritable.parse({ credential: data.get('credential') });
        await api.post(`${base}/registries`, { json });
        await onSuccess();
    }

    return (
        <FormDialog gap={8} onClose={onClose}>
            <Stack gap={3} align="center">
                <Illustration src="/images/lock.png" alt="" className="size-20 object-contain" decoding="async" />
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
                    <Stack>
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
                        <Button label="Save" variant="default" type="submit" />
                    </Stack>
                </Stack>
            </Form>
        </FormDialog>
    );
}
