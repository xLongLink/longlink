import { z } from 'zod';
import { api } from '@/lib/api';
import * as tabs from '@/platform/tabs';
import { Input } from '@/components/shadcn/input';
import { useSubmit } from '@/lib/hooks/use-submit';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Stack } from '@/components/longlink/layout/stack';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { Heading } from '@/components/longlink/display/heading';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field';
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
    onOpenChange
}: {
    onOpenChange: (open: boolean) => void;
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
        <Dialog
            open
            onOpenChange={onOpenChange}
            title={tag ? 'Edit tab' : 'New tab'}
            showHeader={false}
            bodyPadding={false}
        >
            <form
                className="grid min-h-full grid-cols-1 items-center sm:grid-cols-2"
                onSubmit={form.handleSubmit(submit)}
                noValidate
                aria-busy={form.formState.isSubmitting}
            >
                <fieldset disabled={form.formState.isSubmitting} className="flex min-w-0 flex-col gap-4 border-0 p-6">
                    <Heading level={2} size={4} align="center">
                        {tag ? 'Edit tab' : 'New tab'}
                    </Heading>
                    <Field data-invalid={Boolean(form.formState.errors.name)}>
                        <FieldLabel htmlFor="tag-name">Name</FieldLabel>
                        <Input
                            {...form.register('name')}
                            id="tag-name"
                            aria-invalid={Boolean(form.formState.errors.name)}
                        />
                        <FieldError errors={[form.formState.errors.name]} />
                    </Field>
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
                    <FieldError errors={[form.formState.errors.root]} />
                    <Stack direction="horizontal" align="center" justify="between" gap={2}>
                        <Button
                            type="button"
                            variant="link"
                            disabled={form.formState.isSubmitting}
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {tag ? 'Save' : 'Create tab'}
                        </Button>
                    </Stack>
                </fieldset>
                <Stack
                    direction="horizontal"
                    gap={0}
                    align="center"
                    justify="center"
                    padding={6}
                    className="h-full bg-black/10 dark:bg-black/20"
                >
                    <img
                        src="/images/tabs.png"
                        alt=""
                        width={768}
                        height={768}
                        decoding="async"
                        className="w-full max-w-72 object-contain invert dark:invert-0"
                    />
                </Stack>
            </form>
        </Dialog>
    );
}
