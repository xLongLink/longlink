import type { z } from 'zod';
import { api } from '@/lib/api';
import { useSubmit } from '@/lib/hooks/use-submit';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { FieldError } from '@/components/shadcn/field';
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
    const form = useForm({
        resolver: zodResolver(schemas.zSolutionTagsWrite),
        defaultValues: { tag_ids: solution.tag_ids ?? [] }
    });

    async function save(data: z.output<typeof schemas.zSolutionTagsWrite>) {
        await api.patch(`${base}/solutions/${solution.id}/tags`, { json: data });
        await onSuccess();
    }

    const submit = useSubmit(save, {
        onError: () => form.setError('root', { message: 'Could not save the tags. Please try again.' })
    });

    return (
        <Dialog {...dialogProps} onClose={onClose}>
            <Stack padding={8} minHeight="100%" justify="center" className="shrink-0">
                <Stack gap={6} width="100%" maxWidth={640} className="mx-auto">
                    <h2 className="font-semibold tracking-tight text-3xl text-center">Tags for {solution.name}</h2>
                    <form
                        onSubmit={(event) => {
                            void form.handleSubmit(submit)(event);
                        }}
                        noValidate
                        aria-busy={form.formState.isSubmitting}
                    >
                        <fieldset disabled={form.formState.isSubmitting} className="contents">
                            <Stack gap={4}>
                                <Controller
                                    name="tag_ids"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <div className="flex flex-col gap-2">
                                            <MultiSelector
                                                label="Tags"
                                                value={field.value}
                                                onChange={field.onChange}
                                                options={tags
                                                    .filter((tag) => tag.kind === 'tag')
                                                    .map((tag) => ({ value: tag.id, label: tag.name, icon: tag.icon }))}
                                                placeholder="Select tags"
                                                emptyText="Create tabs in organization settings under General first."
                                            />
                                            <FieldError errors={[fieldState.error]} />
                                        </div>
                                    )}
                                />
                                <Stack direction="horizontal" gap={2} justify="end">
                                    <Button label="Cancel" type="button" variant="ghost" onClick={onClose} />
                                    <Button label="Save" type="submit" variant="default" />
                                </Stack>
                            </Stack>
                        </fieldset>
                        <FieldError errors={[form.formState.errors.root]} />
                    </form>
                </Stack>
            </Stack>
        </Dialog>
    );
}
