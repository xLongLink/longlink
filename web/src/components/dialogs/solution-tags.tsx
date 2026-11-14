import type { z } from 'zod';
import { api } from '@/lib/api';
import { FormDialog } from './form-dialog';
import { Form } from '@/components/custom/form';
import { MultiSelector } from '@/components/ui/multi-selector';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeButton as Button } from '@/components/ui/native-button';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeHeading as Heading } from '@/components/custom/native-heading';

export function SolutionTags({
    base,
    tags,
    solution,
    onSuccess,
    onClose
}: {
    base: string;
    tags: z.output<typeof schemas.zOrganizationTagResponse>[];
    solution: Pick<z.output<typeof schemas.zOrganizationSolutionSummary>, 'id' | 'name' | 'tag_ids'>;
    onSuccess: () => Promise<void>;
    onClose: () => void;
}) {
    async function save(data: FormData) {
        const json = schemas.zSolutionTagsWrite.parse({ tag_ids: data.getAll('tag_ids') });
        await api.patch(`${base}/solutions/${solution.id}/tags`, { json });
        await onSuccess();
    }

    return (
        <FormDialog gap={6} onClose={onClose}>
            <Heading level={2} className="text-center">
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
