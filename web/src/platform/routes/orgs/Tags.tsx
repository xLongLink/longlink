import type { z } from 'zod';
import { api } from '@/lib/api';
import * as tabs from '@/platform/tabs';
import { useApiError } from '@/lib/errors';
import { Form } from '@/components/ui/Form';
import { useApi } from '@/lib/hooks/use-api';
import { Text } from '@astryxdesign/core/Text';
import { Dialog } from '@/components/ui/Dialog';
import { Stack } from '@astryxdesign/core/Stack';
import { useState, isValidElement } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { DeletionDialog } from '@/components/Deletion';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Selector } from '@astryxdesign/core/Selector';
import { useQueryClient } from '@tanstack/react-query';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Table, proportional } from '@astryxdesign/core/Table';
import { MultiSelector } from '@astryxdesign/core/MultiSelector';
import { ArrowDown, ArrowUp, Pencil, Trash } from 'lucide-react';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

type Tag = z.output<typeof schemas.zOrganizationTagResponse>;

/** Lists and manages the shared tags used as top-level Organization tabs. */
export default function TabsSection({ base, canMaintain }: { base: string; canMaintain: boolean }) {
    const [tags, invalidateTags] = useApi(`${base}/tags`, schemas.zOrganizationTagResponse.array());
    const queryClient = useQueryClient();
    const [editing, setEditing] = useState<Tag | 'create' | null>(null);
    const [deleting, setDeleting] = useState<Tag | null>(null);
    const [isMoving, setIsMoving] = useState(false);
    const reportError = useApiError();

    /** Persists relative moves and lets the shared query update navigation and table rows. */
    async function move(tag: Tag, direction: 'up' | 'down') {
        setIsMoving(true);

        try {
            const json = schemas.zOrganizationTagMove.parse({ direction });
            await api.post(`${base}/tags/${tag.id}/move`, { json });
            await invalidateTags();
        } catch (failure) {
            reportError(failure);
        } finally {
            setIsMoving(false);
        }
    }

    /** Refreshes navigation and removes stale assignments from cached Solution lists. */
    async function invalidate() {
        await Promise.all([
            invalidateTags(),
            queryClient.invalidateQueries({ queryKey: ['api', `${base}/solutions`], exact: true }),
        ]);
    }

    // Keep category editing separate from Solution deployments and assignments.
    return (
        <>
            <Stack gap={3}>
                <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                    <Heading level={4} accessibilityLevel={3}>
                        Tabs
                    </Heading>
                    {canMaintain && <Button label="New tab" size="sm" onClick={() => setEditing('create')} />}
                </Stack>
                <Table
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
                            },
                        },
                        ...(canMaintain
                            ? [
                                  {
                                      key: 'id',
                                      header: 'Actions',
                                      align: 'end' as const,
                                      renderCell: (tag: Tag) => (
                                          <MoreMenu
                                              label={`Actions for ${tag.name}`}
                                              size="sm"
                                              alignment="end"
                                              isDisabled={isMoving}
                                              items={[
                                                  {
                                                      id: 'edit',
                                                      label: 'Edit',
                                                      icon: <Pencil className="size-4" aria-hidden="true" />,
                                                      onClick: () => setEditing(tag),
                                                  },
                                                  {
                                                      id: 'up',
                                                      label: 'Move Up',
                                                      icon: <ArrowUp className="size-4" aria-hidden="true" />,
                                                      isDisabled: tags[0]?.id === tag.id,
                                                      onClick: () => {
                                                          void move(tag, 'up');
                                                      },
                                                  },
                                                  {
                                                      id: 'down',
                                                      label: 'Move Down',
                                                      icon: <ArrowDown className="size-4" aria-hidden="true" />,
                                                      isDisabled: tags[tags.length - 1]?.id === tag.id,
                                                      onClick: () => {
                                                          void move(tag, 'down');
                                                      },
                                                  },
                                                  {
                                                      id: 'delete',
                                                      label: 'Delete',
                                                      variant: 'destructive',
                                                      icon: <Trash className="size-4" aria-hidden="true" />,
                                                      onClick: () => setDeleting(tag),
                                                  },
                                              ]}
                                          />
                                      ),
                                  },
                              ]
                            : []),
                    ]}
                />
            </Stack>
            {editing && (
                <TagForm
                    key={editing === 'create' ? 'create' : editing.id}
                    base={base}
                    tag={editing === 'create' ? null : editing}
                    onCancel={() => setEditing(null)}
                    onSuccess={async () => {
                        // Refresh shared data before dismissing only the completed edit.
                        await invalidate();
                        setEditing((current) => (current === editing ? null : current));
                    }}
                />
            )}
            <DeletionDialog
                confirmation={
                    deleting
                        ? {
                              title: 'Delete tab',
                              description: `Delete tab ${deleting.name}? Solutions will not be deleted and will keep their other tags.`,
                              onDelete: async () => {
                                  // Cascading assignments disappear with the tag, never the Solutions.
                                  await api.delete(`${base}/tags/${deleting.id}`);
                                  await invalidate();
                                  setDeleting(null);
                              },
                          }
                        : null
                }
                onClose={() => setDeleting(null)}
            />
        </>
    );
}

/** Creates or edits a category while retaining failed drafts. */
function TagForm({
    base,
    tag,
    onSuccess,
    onCancel,
}: {
    base: string;
    tag: Tag | null;
    onSuccess: () => Promise<void>;
    onCancel: () => void;
}) {
    const [name, setName] = useState(tag?.name ?? '');
    const [icon, setIcon] = useState(tag?.icon ?? 'tag');

    /** Saves presentation without changing the tab's filtering or assignments. */
    async function save() {
        const json = schemas.zOrganizationTagWrite.parse({ name: name.trim(), icon });

        if (tag) {
            await api.patch(`${base}/tags/${tag.id}`, { json });
        } else {
            await api.post(`${base}/tags`, { json });
        }

        await onSuccess();
    }

    return (
        <Dialog
            isOpen
            onOpenChange={(open) => {
                if (!open) onCancel();
            }}
        >
            <Stack height="min(560px, calc(100dvh - var(--spacing-10) * 4))">
                <Layout
                    padding={0}
                    content={
                        <LayoutContent padding={8}>
                            <Stack
                                gap={6}
                                minHeight="100%"
                                justify="center"
                                width="100%"
                                maxWidth={640}
                                className="mx-auto"
                            >
                                <Heading level={2} justify="center">
                                    {tag ? 'Edit tab' : 'New tab'}
                                </Heading>
                                <Form action={save} submitDisabled={!name.trim()}>
                                    <Stack gap={3}>
                                        <TextInput label="Name" value={name} onChange={setName} isRequired />
                                        <Selector
                                            label="Icon"
                                            value={icon}
                                            onChange={(value) => setIcon(schemas.zTagIcon.parse(value))}
                                            options={Object.entries(tabs.icons).map(([value, option]) => ({
                                                value,
                                                label: option.label,
                                                icon: <option.component className="size-4" aria-hidden="true" />,
                                            }))}
                                            hasSearch
                                        />
                                        <Stack direction="horizontal" gap={2}>
                                            <Button
                                                label={tag ? 'Save' : 'Create tab'}
                                                type="submit"
                                                variant="primary"
                                                isDisabled={!name.trim()}
                                            />
                                            <Button label="Cancel" type="button" variant="ghost" onClick={onCancel} />
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

/** Replaces a Solution's tags only after explicit submission. */
export function SolutionTags({
    base,
    tags,
    solution,
    onSuccess,
    onClose,
}: {
    base: string;
    tags: Tag[];
    solution: z.output<typeof schemas.zOrganizationSolutionSummary>;
    onSuccess: () => Promise<void>;
    onClose: () => void;
}) {
    const [tagIds, setTagIds] = useState(solution.tag_ids ?? []);

    /** Submits the complete selection so clearing all tags is supported. */
    async function save() {
        const json = schemas.zSolutionTagsWrite.parse({ tag_ids: tagIds });
        await api.patch(`${base}/solutions/${solution.id}/tags`, { json });
        await onSuccess();
    }

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
                                gap={6}
                                minHeight="100%"
                                justify="center"
                                width="100%"
                                maxWidth={640}
                                className="mx-auto"
                            >
                                <Heading level={2} justify="center">
                                    Tags for {solution.name}
                                </Heading>
                                <Form action={save}>
                                    <Stack gap={4}>
                                        <MultiSelector
                                            label="Tags"
                                            value={tagIds}
                                            onChange={setTagIds}
                                            options={tags
                                                .filter((tag) => tag.kind === 'tag')
                                                .map((tag) => {
                                                    const Icon = tabs.icons[tag.icon].component;

                                                    return {
                                                        value: tag.id,
                                                        label: tag.name,
                                                        icon: <Icon className="size-4" aria-hidden="true" />,
                                                    };
                                                })}
                                            renderOption={(option) => (
                                                <Stack direction="horizontal" gap={2} align="center">
                                                    {isValidElement(option.icon) && option.icon}
                                                    <Text>{option.label}</Text>
                                                </Stack>
                                            )}
                                            triggerDisplay="labels"
                                            placeholder="Select tags"
                                            hasSearch
                                            hasClear
                                            emptyText="Create tabs in organization settings under General first."
                                        />
                                        <Stack direction="horizontal" gap={2} justify="end">
                                            <Button label="Cancel" type="button" variant="ghost" onClick={onClose} />
                                            <Button label="Save" type="submit" variant="primary" />
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
