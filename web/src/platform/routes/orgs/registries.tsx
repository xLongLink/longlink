import { api } from '@/lib/api';
import { useState } from 'react';
import { useApi } from '@/lib/hooks/use-api';
import { Separator } from '@/components/shadcn/separator';
import { Stack } from '@/components/longlink/layout/stack';
import { Empty } from '@/components/longlink/display/empty';
import { Button } from '@/components/longlink/action/button';
import { Heading } from '@/components/longlink/display/heading';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { useConfirm } from '@/components/longlink/hooks/use-confirm';
import { RegistryForm } from '@/platform/routes/orgs/dialogs/registry-form';
import { Table, TableBody, TableRow, TableCell } from '@/components/longlink/display/table';

/** Lists organization-owned registry connections without loading credentials. */
export default function Registries({ base, canMaintain }: { base: string; canMaintain: boolean }) {
    const [connections, invalidate] = useApi(`${base}/registries`, schemas.zRegistryResponse.array());
    const [action, setAction] = useState<{ kind: 'create' } | null>(null);
    const confirmation = useConfirm();

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
            <Stack gap={0}>
                <Stack gap={4}>
                    <Stack gap={0} direction="horizontal" justify="between" align="end" wrap="wrap" className="min-h-8">
                        <Heading level={2} trim>
                            Private registries
                        </Heading>
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
                </Stack>
                <Table wrap>
                    <TableBody>
                        {connections.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>{row.host}</TableCell>
                                <TableCell>{row.username}</TableCell>
                                {canMaintain && (
                                    <TableCell align="end">
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() =>
                                                confirmation.show({
                                                    title: 'Delete registry',
                                                    description: `Delete ${row.username} (${row.host})? Connections used by retained Solution revisions cannot be deleted.`,
                                                    actionLabel: 'Delete',
                                                    actionVariant: 'destructive',
                                                    onAction: async () => {
                                                        await api.delete(`${base}/registries/${row.id}`);
                                                        await invalidate();
                                                    }
                                                })
                                            }
                                        >
                                            Delete
                                        </Button>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {connections.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={canMaintain ? 3 : 2} align="center">
                                    <Empty role="status" title="No data" />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Stack>
            {action && <RegistryForm base={base} onSuccess={onSuccess} onOpenChange={closeAction} />}
            {confirmation.element}
        </>
    );
}
