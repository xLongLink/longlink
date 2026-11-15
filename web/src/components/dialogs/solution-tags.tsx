import type { z } from 'zod';
import { api } from '@/lib/api';
import { Form } from '@/components/custom/form';
import { MultiSelector } from '@/components/custom/multi-selector';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Dialog, type DialogProps } from '@/components/custom/dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeButton as Button } from '@/components/custom/native-button';

export function SolutionTags({
    base,
    tags,
    solution,
    onSuccess,
    onClose,
    ...dialogProps
}: DialogProps & {
    base: string;
    tags: z.output<typeof schemas.zOrganizationTagResponse>[];
    solution: Pick<z.output<typeof schemas.zOrganizationSolutionSummary>, 'id' | 'name' | 'tag_ids'>;
    onSuccess: () => Promise<void>;
}) {
    async function save(data: FormData) {
        const json = schemas.zSolutionTagsWrite.parse({ tag_ids: data.getAll('tag_ids') });
        await api.patch(`${base}/solutions/${solution.id}/tags`, { json });
        await onSuccess();
    }

    return (
        <Dialog {...dialogProps} onClose={onClose}>
            <Stack padding={8} minHeight="100%" justify="center" className="shrink-0">
                <Stack gap={6} width="100%" maxWidth={640} className="mx-auto">
                    <h2 className="font-semibold tracking-tight text-3xl text-center">Tags for {solution.name}</h2>
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
                </Stack>
            </Stack>
        </Dialog>
    );
}
