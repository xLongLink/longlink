import { z } from 'zod';
import { api } from '@/lib/api';
import * as tabs from '@/platform/tabs';
import { Input } from '@/components/shadcn/input';
import { useSubmit } from '@/lib/hooks/use-submit';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Dialog, type DialogProps } from '@/components/custom/dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field';
import { NativeButton as Button } from '@/components/custom/native-button';
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList
} from '@/components/shadcn/combobox';

const tagSchema = schemas.zOrganizationTagWrite.extend({
    name: z.string().trim().pipe(schemas.zOrganizationTagWrite.shape.name)
});

export function TagForm({
    base,
    tag,
    onSuccess,
    onClose,
    ...dialogProps
}: DialogProps & {
    base: string;
    tag: z.output<typeof schemas.zOrganizationTagResponse> | null;
    onSuccess: () => Promise<void>;
}) {
    const form = useForm({
        resolver: zodResolver(tagSchema),
        defaultValues: { name: tag?.name ?? '', icon: tag?.icon ?? 'tag' }
    });

    async function save(json: z.output<typeof tagSchema>) {
        if (tag) {
            await api.patch(`${base}/tags/${tag.id}`, { json });
        } else {
            await api.post(`${base}/tags`, { json });
        }

        await onSuccess();
    }

    const submit = useSubmit(save, {
        onError: () => form.setError('root', { message: 'Could not save the tab. Please try again.' })
    });

    return (
        <Dialog {...dialogProps} onClose={onClose}>
            <Stack padding={8} minHeight="100%" justify="center" className="shrink-0">
                <Stack gap={6} width="100%" maxWidth={640} className="mx-auto">
                    <h2 className="font-semibold tracking-tight text-3xl text-center">
                        {tag ? 'Edit tab' : 'New tab'}
                    </h2>
                    <form
                        onSubmit={(event) => {
                            void form.handleSubmit(submit)(event);
                        }}
                        noValidate
                        aria-busy={form.formState.isSubmitting}
                    >
                        <fieldset disabled={form.formState.isSubmitting} className="contents">
                            <Stack gap={3}>
                                <Controller
                                    name="name"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="tag-name">Name</FieldLabel>
                                            <Input {...field} id="tag-name" aria-invalid={fieldState.invalid} />
                                            <FieldError errors={[fieldState.error]} />
                                        </Field>
                                    )}
                                />
                                <Controller
                                    name="icon"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="tag-icon">Icon</FieldLabel>
                                            <Combobox
                                                items={schemas.zTagIcon.options}
                                                value={field.value}
                                                onValueChange={(value) => field.onChange(value ?? 'tag')}
                                                itemToStringLabel={(icon) => tabs.icons[icon].label}
                                                disabled={form.formState.isSubmitting}
                                            >
                                                <ComboboxInput
                                                    ref={field.ref}
                                                    id="tag-icon"
                                                    onBlur={field.onBlur}
                                                    aria-invalid={fieldState.invalid}
                                                    disabled={form.formState.isSubmitting}
                                                    className="w-full"
                                                />
                                                <ComboboxContent>
                                                    <ComboboxEmpty>No results found</ComboboxEmpty>
                                                    <ComboboxList>
                                                        {(icon: z.output<typeof schemas.zTagIcon>) => {
                                                            const option = tabs.icons[icon];
                                                            const Icon = option.component;

                                                            return (
                                                                <ComboboxItem key={icon} value={icon}>
                                                                    <Icon aria-hidden="true" />
                                                                    {option.label}
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
                                <Stack direction="horizontal" gap={2}>
                                    <Button label={tag ? 'Save' : 'Create tab'} type="submit" variant="default" />
                                    <Button label="Cancel" type="button" variant="ghost" onClick={onClose} />
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
