import type { z } from 'zod';
import { api } from '@/lib/api';
import * as tabs from '@/platform/tabs';
import { useSubmit } from '@/lib/hooks/use-submit';
import { Button } from '@/components/shadcn/button';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Dialog } from '@/components/custom/native-dialog';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { DialogContent, DialogTitle } from '@/components/shadcn/dialog';
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field';
import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxList,
    ComboboxValue,
    useComboboxAnchor
} from '@/components/shadcn/combobox';

export function SolutionTags({
    base,
    tags,
    solution,
    onSuccess,
    onOpenChange,
    ...dialogProps
}: { open: boolean; onOpenChange: (open: boolean) => void } & {
    base: string;
    tags: z.output<typeof schemas.zOrganizationTagResponse>[];
    solution: Pick<z.output<typeof schemas.zOrganizationSolutionSummary>, 'id' | 'name' | 'tag_ids'>;
    onSuccess: () => Promise<void>;
}) {
    const anchor = useComboboxAnchor();
    const availableTags = tags.filter((tag) => tag.kind === 'tag');
    const tagsById = new Map(availableTags.map((tag) => [tag.id, tag]));

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
        <Dialog {...dialogProps} onOpenChange={onOpenChange}>
            <DialogContent>
                <Stack className="max-h-[80dvh] overflow-auto">
                    <Stack gap={6} width="100%" maxWidth={640} className="mx-auto">
                        <DialogTitle>Tags for {solution.name}</DialogTitle>
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
                                            <Field data-invalid={fieldState.invalid}>
                                                <FieldLabel htmlFor="solution-tags">Tags</FieldLabel>
                                                <Combobox
                                                    multiple
                                                    items={availableTags.map((tag) => tag.id)}
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                    itemToStringLabel={(id) => tagsById.get(id)?.name ?? id}
                                                    disabled={form.formState.isSubmitting}
                                                >
                                                    <ComboboxChips ref={anchor}>
                                                        <ComboboxValue>
                                                            {(ids: string[]) => (
                                                                <>
                                                                    {ids.map((id) => {
                                                                        const name = tagsById.get(id)?.name ?? id;

                                                                        return (
                                                                            <ComboboxChip key={id} aria-label={name}>
                                                                                {name}
                                                                            </ComboboxChip>
                                                                        );
                                                                    })}
                                                                    <ComboboxChipsInput
                                                                        ref={field.ref}
                                                                        id="solution-tags"
                                                                        onBlur={field.onBlur}
                                                                        placeholder={
                                                                            ids.length ? undefined : 'Select tags'
                                                                        }
                                                                        aria-invalid={fieldState.invalid}
                                                                        disabled={form.formState.isSubmitting}
                                                                    />
                                                                </>
                                                            )}
                                                        </ComboboxValue>
                                                    </ComboboxChips>
                                                    <ComboboxContent anchor={anchor}>
                                                        <ComboboxEmpty>
                                                            {availableTags.length
                                                                ? 'No results found'
                                                                : 'Create tabs in organization settings under General first.'}
                                                        </ComboboxEmpty>
                                                        <ComboboxList>
                                                            {(id: string) => {
                                                                const tag = tagsById.get(id);

                                                                if (!tag) return null;
                                                                const Icon = tabs.icons[tag.icon].component;

                                                                return (
                                                                    <ComboboxItem key={id} value={id}>
                                                                        <Icon aria-hidden="true" />
                                                                        {tag.name}
                                                                    </ComboboxItem>
                                                                );
                                                            }}
                                                        </ComboboxList>
                                                    </ComboboxContent>
                                                </Combobox>
                                                <FieldError errors={[fieldState.error]} />
                                            </Field>
                                        )}
                                    />
                                    <Stack direction="horizontal" gap={2} justify="end">
                                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit">Save</Button>
                                    </Stack>
                                </Stack>
                            </fieldset>
                            <FieldError errors={[form.formState.errors.root]} />
                        </form>
                    </Stack>
                </Stack>
            </DialogContent>
        </Dialog>
    );
}
