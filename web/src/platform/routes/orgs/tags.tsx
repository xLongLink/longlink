import { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import * as tabs from '@/platform/tabs';
import { useApiError } from '@/lib/errors';
import { TagForm } from '@/components/dialogs/tag-form';
import { Stack } from '@/components/longlink/layout/stack';
import { Button } from '@/components/longlink/action/button';
import { DeletionDialog } from '@/components/dialogs/deletion';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Ellipsis, Pencil, Trash } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/shadcn/dropdown-menu';

type Tag = z.output<typeof schemas.zOrganizationTagResponse>;

type TagAction = { kind: 'create' } | { kind: 'edit' | 'delete'; tag: Tag };

/** Lists and manages the shared tags used as top-level Organization tabs. */
export default function TabsSection({ base, tags, canMaintain }: { base: string; tags: Tag[]; canMaintain: boolean }) {
    const queryClient = useQueryClient();
    const [action, setAction] = useState<TagAction | null>(null);
    const reportError = useApiError();

    // Keep moves pending until the shared navigation and table rows refresh.
    const move = useMutation({
        mutationFn: async ({ tag, direction }: { tag: Tag; direction: 'up' | 'down' }) => {
            const json = schemas.zOrganizationTagMove.parse({ direction });
            await api.post(`${base}/tags/${tag.id}/move`, { json });
            await queryClient.invalidateQueries({ queryKey: ['api', `${base}/tags`], exact: true });
        },
        onError: reportError,
        retry: false,
        networkMode: 'always'
    });

    // Keep category editing separate from Solution deployments and assignments.
    return (
        <>
            <Stack gap={3}>
                <Stack gap={0} direction="horizontal" justify="between" align="center" wrap="wrap">
                    <h4 className="font-semibold tracking-tight text-xl" aria-level={3}>
                        Tabs
                    </h4>
                    {canMaintain && (
                        <Button size="sm" onClick={() => setAction({ kind: 'create' })}>
                            New tab
                        </Button>
                    )}
                </Stack>
                <Table wrap>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tab</TableHead>
                            {canMaintain && <TableHead align="end">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tags.map((row) => {
                            const Icon = tabs.icons[row.icon].component;

                            return (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        <Stack direction="horizontal" gap={2} align="center">
                                            <Icon className="size-4" aria-hidden="true" />
                                            <span>{row.name}</span>
                                        </Stack>
                                    </TableCell>
                                    {canMaintain && (
                                        <TableCell align="end">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger
                                                    render={
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            aria-label={`Actions for ${row.name}`}
                                                            disabled={move.isPending}
                                                        >
                                                            <Ellipsis aria-hidden="true" />
                                                        </Button>
                                                    }
                                                />
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => setAction({ kind: 'edit', tag: row })}
                                                    >
                                                        <Pencil aria-hidden="true" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        disabled={tags[0]?.id === row.id}
                                                        onClick={() => move.mutate({ tag: row, direction: 'up' })}
                                                    >
                                                        <ArrowUp aria-hidden="true" />
                                                        Move Up
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        disabled={tags[tags.length - 1]?.id === row.id}
                                                        onClick={() => move.mutate({ tag: row, direction: 'down' })}
                                                    >
                                                        <ArrowDown aria-hidden="true" />
                                                        Move Down
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        variant="destructive"
                                                        onClick={() => setAction({ kind: 'delete', tag: row })}
                                                    >
                                                        <Trash aria-hidden="true" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                        {tags.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={canMaintain ? 2 : 1} align="center">
                                    <Empty role="status" title="No data" />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Stack>
            {action && action.kind !== 'delete' && (
                <TagForm
                    key={action.kind === 'create' ? 'create' : action.tag.id}
                    base={base}
                    tag={action.kind === 'create' ? null : action.tag}
                    onOpenChange={() => setAction(null)}
                    onSuccess={async () => {
                        // Refresh shared data before dismissing only the completed edit.
                        await queryClient.invalidateQueries({ queryKey: ['api', `${base}/tags`], exact: true });
                        setAction((current) => (current === action ? null : current));
                    }}
                />
            )}
            <DeletionDialog
                confirmation={
                    action?.kind === 'delete'
                        ? {
                              title: 'Delete tab',
                              description: `Delete tab ${action.tag.name}? Solutions will not be deleted and will keep their other tags.`,
                              onDelete: async () => {
                                  // Cascading assignments disappear with the tag, never the Solutions.
                                  await api.delete(`${base}/tags/${action.tag.id}`);
                                  await Promise.all([
                                      queryClient.invalidateQueries({ queryKey: ['api', `${base}/tags`], exact: true }),
                                      queryClient.invalidateQueries({
                                          queryKey: ['api', `${base}/solutions`],
                                          exact: true
                                      })
                                  ]);
                                  setAction((current) => (current === action ? null : current));
                              }
                          }
                        : null
                }
                onClose={() => setAction(null)}
            />
        </>
    );
}
import { Empty } from '@/components/longlink/display/empty';
