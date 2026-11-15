import type { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import { useApi } from '@/lib/hooks/use-api';
import { Button } from '@/components/shadcn/button';
import { Separator } from '@/components/shadcn/separator';
import { DeletionDialog } from '@/components/dialogs/deletion';
import { RegistryForm } from '@/components/dialogs/registry-form';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/shadcn/table';

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
                    minHeight="calc(var(--spacing)*8)"
                >
                    <h2 className="font-semibold tracking-tight text-3xl block [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]">
                        Private registries
                    </h2>
                    {canMaintain && (
                        <Button
                            size="sm"
                            onClick={() =>
                                setAction((current) => (current?.kind === 'create' ? current : { kind: 'create' }))
                            }
                        >
                            Add registry
                        </Button>
                    )}
                </Stack>
                <Separator />
                <Table className="[&_td]:whitespace-normal">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Registry</TableHead>
                            <TableHead>Username</TableHead>
                            {canMaintain && <TableHead className="text-end">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {connections.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>{row.host}</TableCell>
                                <TableCell>{row.username}</TableCell>
                                {canMaintain && (
                                    <TableCell className="text-end">
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => setAction({ kind: 'delete', connection: row })}
                                        >
                                            Delete
                                        </Button>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {connections.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={canMaintain ? 3 : 2} className="text-center">
                                    <Empty role="status" title="No data" />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Stack>
            {action?.kind === 'create' && (
                <RegistryForm open base={base} onSuccess={onSuccess} onOpenChange={closeAction} />
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
import { Empty } from '@/components/longlink/empty';
