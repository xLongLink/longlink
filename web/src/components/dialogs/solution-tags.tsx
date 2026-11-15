import type { z } from 'zod';
import { api } from '@/lib/api';
import * as tabs from '@/platform/tabs';
import { useSubmit } from '@/lib/hooks/use-submit';
import { Button } from '@/components/shadcn/button';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Dialog, type DialogProps } from '@/components/custom/dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
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
    onClose,
    ...dialogProps
}: DialogProps & {
    base: string;
    tags: z.output<typeof schemas.zOrganizationTagResponse>[];
    solution: Pick<z.output<typeof schemas.zOrganizationSolutionSummary>, 'id' | 'name' | 'tag_ids'>;
    onSuccess: () => Promise<void>;
}) {
    const anchor = useComboboxAnchor();
    const availableTags = tags.filter((tag) => tag.kind === 'tag');

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
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="solution-tags">Tags</FieldLabel>
                                            <Combobox
                                                multiple
                                                items={availableTags.map((tag) => tag.id)}
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                itemToStringLabel={(id) =>
                                                    availableTags.find((tag) => tag.id === id)?.name ?? id
                                                }
                                                disabled={form.formState.isSubmitting}
                                            >
                                                <ComboboxChips ref={anchor}>
                                                    <ComboboxValue>
                                                        {(ids: string[]) => (
                                                            <>
                                                                {ids.map((id) => {
                                                                    const name =
                                                                        availableTags.find((tag) => tag.id === id)
                                                                            ?.name ?? id;

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
                                                                    placeholder={ids.length ? undefined : 'Select tags'}
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
                                                            const tag = availableTags.find((tag) => tag.id === id);

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
                                    <Button type="button" variant="ghost" onClick={onClose}>
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
        </Dialog>
    );
}
