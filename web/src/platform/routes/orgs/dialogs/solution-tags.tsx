import type { z } from 'zod';
import { api } from '@/lib/api';
import * as tabs from '@/platform/tabs';
import { useSubmit } from '@/lib/hooks/use-submit';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Stack } from '@/components/longlink/layout/stack';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { Heading } from '@/components/longlink/display/heading';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { IllustratedForm } from '@/platform/components/illustrated-form';
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
    useComboboxAnchor
} from '@/components/shadcn/combobox';

export function SolutionTags({
    base,
    tags,
    solution,
    onSuccess,
    onClose
}: {
    onClose: () => void;
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
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            title={`Tags for ${solution.name}`}
            showHeader={false}
            bodyPadding={false}
        >
            <IllustratedForm
                image={{ src: '/images/tabs.png', width: 768, height: 768 }}
                onSubmit={form.handleSubmit(submit)}
                noValidate
                aria-busy={form.formState.isSubmitting}
            >
                <fieldset disabled={form.formState.isSubmitting} className="flex min-w-0 flex-col gap-4 border-0 p-6">
                    <Heading level={2} size={4} align="center">
                        Tags for {solution.name}
                    </Heading>
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
                                        {field.value.map((id) => {
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
                                            placeholder={field.value.length ? undefined : 'Select tags'}
                                            aria-invalid={fieldState.invalid}
                                            disabled={form.formState.isSubmitting}
                                        />
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
                    <FieldError errors={[form.formState.errors.root]} />
                    <Stack direction="horizontal" align="center" justify="between" gap={2}>
                        <Button type="button" variant="link" disabled={form.formState.isSubmitting} onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            Save
                        </Button>
                    </Stack>
                </fieldset>
            </IllustratedForm>
        </Dialog>
    );
}
