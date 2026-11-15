import { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import * as tabs from '@/platform/tabs';
import { useApiError } from '@/lib/errors';
import { TagForm } from '@/components/dialogs/tag-form';
import { DeletionDialog } from '@/components/dialogs/deletion';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { DataTable, proportional } from '@/components/custom/data-table';
import { Button as MenuTriggerButton } from '@/components/shadcn/button';
import { NativeButton as Button } from '@/components/custom/native-button';
import { ArrowDown, ArrowUp, Ellipsis, Pencil, Trash } from 'lucide-react';
import { NativeHeading as Heading } from '@/components/custom/native-heading';
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
                <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                    <Heading level={4} accessibilityLevel={3}>
                        Tabs
                    </Heading>
                    {canMaintain && <Button label="New tab" size="sm" onClick={() => setAction({ kind: 'create' })} />}
                </Stack>
                <DataTable
                    data={tags}
                    idKey="id"
                    density="compact"
                    columns={[
                        {
                            key: 'name',
                            header: 'Tab',
                            width: proportional(1),
                            renderCell: (tab) => {
                                const Icon = tabs.icons[tab.icon].component;

                                return (
                                    <Stack direction="horizontal" gap={2} align="center">
                                        <Icon className="size-4" aria-hidden="true" />
                                        <Text>{tab.name}</Text>
                                    </Stack>
                                );
                            }
                        },
                        ...(canMaintain
                            ? [
                                  {
                                      key: 'id',
                                      header: 'Actions',
                                      align: 'end' as const,
                                      renderCell: (tag: Tag) => (
                                          <DropdownMenu>
                                              <DropdownMenuTrigger
                                                  render={
                                                      <MenuTriggerButton
                                                          type="button"
                                                          variant="ghost"
                                                          size="icon-sm"
                                                          aria-label={`Actions for ${tag.name}`}
                                                          disabled={move.isPending}
                                                      >
                                                          <Ellipsis aria-hidden="true" />
                                                      </MenuTriggerButton>
                                                  }
                                              />
                                              <DropdownMenuContent align="end">
                                                  <DropdownMenuItem onClick={() => setAction({ kind: 'edit', tag })}>
                                                      <Pencil aria-hidden="true" />
                                                      Edit
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem
                                                      disabled={tags[0]?.id === tag.id}
                                                      onClick={() => move.mutate({ tag, direction: 'up' })}
                                                  >
                                                      <ArrowUp aria-hidden="true" />
                                                      Move Up
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem
                                                      disabled={tags[tags.length - 1]?.id === tag.id}
                                                      onClick={() => move.mutate({ tag, direction: 'down' })}
                                                  >
                                                      <ArrowDown aria-hidden="true" />
                                                      Move Down
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem
                                                      variant="destructive"
                                                      onClick={() => setAction({ kind: 'delete', tag })}
                                                  >
                                                      <Trash aria-hidden="true" />
                                                      Delete
                                                  </DropdownMenuItem>
                                              </DropdownMenuContent>
                                          </DropdownMenu>
                                      )
                                  }
                              ]
                            : [])
                    ]}
                />
            </Stack>
            {action && action.kind !== 'delete' && (
                <TagForm
                    key={action.kind === 'create' ? 'create' : action.tag.id}
                    base={base}
                    tag={action.kind === 'create' ? null : action.tag}
                    onClose={() => setAction(null)}
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
