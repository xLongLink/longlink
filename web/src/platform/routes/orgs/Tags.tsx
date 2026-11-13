import { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import * as tabs from '@/platform/tabs';
import { FormDialog } from './FormDialog';
import { useApiError } from '@/lib/errors';
import { Form } from '@/components/custom/Form';
import { DeletionDialog } from '@/components/Deletion';
import { Selector } from '@/components/custom/Selector';
import { TextInput } from '@/components/custom/TextInput';
import { ArrowDown, ArrowUp, Pencil, Trash } from 'lucide-react';
import { MultiSelector } from '@/components/custom/MultiSelector';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeMoreMenu } from '@/components/custom/NativeMoreMenu';
import { NativeText as Text } from '@/components/custom/NativeText';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeStack as Stack } from '@/components/custom/NativeStack';
import { DataTable, proportional } from '@/components/custom/DataTable';
import { NativeButton as Button } from '@/components/custom/NativeButton';
import { NativeHeading as Heading } from '@/components/custom/NativeHeading';

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
                                          <NativeMoreMenu
                                              label={`Actions for ${tag.name}`}
                                              size="sm"
                                              alignment="end"
                                              isDisabled={move.isPending}
                                              items={[
                                                  {
                                                      id: 'edit',
                                                      label: 'Edit',
                                                      icon: <Pencil className="size-4" aria-hidden="true" />,
                                                      onClick: () => setAction({ kind: 'edit', tag })
                                                  },
                                                  {
                                                      id: 'up',
                                                      label: 'Move Up',
                                                      icon: <ArrowUp className="size-4" aria-hidden="true" />,
                                                      isDisabled: tags[0]?.id === tag.id,
                                                      onClick: () => move.mutate({ tag, direction: 'up' })
                                                  },
                                                  {
                                                      id: 'down',
                                                      label: 'Move Down',
                                                      icon: <ArrowDown className="size-4" aria-hidden="true" />,
                                                      isDisabled: tags[tags.length - 1]?.id === tag.id,
                                                      onClick: () => move.mutate({ tag, direction: 'down' })
                                                  },
                                                  {
                                                      id: 'delete',
                                                      label: 'Delete',
                                                      variant: 'destructive',
                                                      icon: <Trash className="size-4" aria-hidden="true" />,
                                                      onClick: () => setAction({ kind: 'delete', tag })
                                                  }
                                              ]}
                                          />
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
                    onCancel={() => setAction(null)}
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

/** Creates or edits a category while retaining failed drafts. */
function TagForm({
    base,
    tag,
    onSuccess,
    onCancel
}: {
    base: string;
    tag: Tag | null;
    onSuccess: () => Promise<void>;
    onCancel: () => void;
}) {
    /** Saves presentation without changing the tab's filtering or assignments. */
    async function save(data: FormData) {
        const json = schemas.zOrganizationTagWrite.parse({
            name: z.string().trim().parse(data.get('name')),
            icon: data.get('icon')
        });

        if (tag) {
            await api.patch(`${base}/tags/${tag.id}`, { json });
        } else {
            await api.post(`${base}/tags`, { json });
        }

        await onSuccess();
    }

    return (
        <FormDialog gap={6} onClose={onCancel}>
            <Heading level={2} justify="center">
                {tag ? 'Edit tab' : 'New tab'}
            </Heading>
            <Form action={save}>
                <Stack gap={3}>
                    <TextInput label="Name" name="name" defaultValue={tag?.name ?? ''} required />
                    <Selector
                        label="Icon"
                        name="icon"
                        defaultValue={tag?.icon ?? 'tag'}
                        options={Object.entries(tabs.icons).map(([value, option]) => ({
                            value,
                            label: option.label,
                            icon: schemas.zTagIcon.parse(value)
                        }))}
                        hasSearch
                        hasClear={false}
                    />
                    <Stack direction="horizontal" gap={2}>
                        <Button label={tag ? 'Save' : 'Create tab'} type="submit" variant="default" />
                        <Button label="Cancel" type="button" variant="ghost" onClick={onCancel} />
                    </Stack>
                </Stack>
            </Form>
        </FormDialog>
    );
}

/** Replaces a Solution's tags only after explicit submission. */
export function SolutionTags({
    base,
    tags,
    solution,
    onSuccess,
    onClose
}: {
    base: string;
    tags: Tag[];
    solution: Pick<z.output<typeof schemas.zOrganizationSolutionSummary>, 'id' | 'name' | 'tag_ids'>;
    onSuccess: () => Promise<void>;
    onClose: () => void;
}) {
    /** Submits the complete selection so clearing all tags is supported. */
    async function save(data: FormData) {
        const json = schemas.zSolutionTagsWrite.parse({ tag_ids: data.getAll('tag_ids') });
        await api.patch(`${base}/solutions/${solution.id}/tags`, { json });
        await onSuccess();
    }

    return (
        <FormDialog gap={6} onClose={onClose}>
            <Heading level={2} justify="center">
                Tags for {solution.name}
            </Heading>
            <Form action={save}>
                <Stack gap={4}>
                    <MultiSelector
                        label="Tags"
                        name="tag_ids"
                        defaultValue={solution.tag_ids ?? []}
                        options={tags
                            .filter((tag) => tag.kind === 'tag')
                            .map((tag) => ({ value: tag.id, label: tag.name, icon: tag.icon }))}
                        triggerDisplay="labels"
                        placeholder="Select tags"
                        hasSearch
                        emptyText="Create tabs in organization settings under General first."
                    />
                    <Stack direction="horizontal" gap={2} justify="end">
                        <Button label="Cancel" type="button" variant="ghost" onClick={onClose} />
                        <Button label="Save" type="submit" variant="default" />
                    </Stack>
                </Stack>
            </Form>
        </FormDialog>
    );
}
