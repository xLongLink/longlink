import { z } from 'zod';
import { useId, useState } from 'react';
import { Grid } from '@astryxdesign/core/Grid';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { zodResolver } from '@hookform/resolvers/zod';
import { Selector } from '@astryxdesign/core/Selector';
import { useTranslator } from '@astryxdesign/core/i18n';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { FieldStatus } from '@astryxdesign/core/FieldStatus';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { useUserProfile } from '@/hooks/use-user';
import { useCreateOrganization } from '@/hooks/use-organization';
import { useCountries, useInfrastructureOptions } from '@/data/admin';

const createOrganizationSchema = z.object({
    name: z.string().trim().min(1),
    avatar: z.union([z.literal(''), z.string().trim().url()]),
    country: z.string().length(2),
    computeId: z.string().min(1),
    databaseId: z.string().min(1),
    storageId: z.string().min(1),
});

type CreateOrganizationInput = z.input<typeof createOrganizationSchema>;
type CreateOrganizationValues = z.output<typeof createOrganizationSchema>;

const defaultCreateOrganizationValues = {
    name: '',
    avatar: '',
    country: '',
    computeId: '',
    databaseId: '',
    storageId: '',
} satisfies CreateOrganizationInput;

/** Renders the create-organization dialog. */
export default function CreateOrganization() {
    const t = useTranslator();
    const { role } = useUserProfile();
    const createOrganization = useCreateOrganization();
    const formId = useId();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const form = useForm<CreateOrganizationInput, unknown, CreateOrganizationValues>({
        defaultValues: defaultCreateOrganizationValues,
        mode: 'onChange',
        resolver: zodResolver(createOrganizationSchema),
    });
    const country = useWatch({ control: form.control, name: 'country' });
    const computeId = useWatch({ control: form.control, name: 'computeId' });
    const databaseId = useWatch({ control: form.control, name: 'databaseId' });
    const storageId = useWatch({ control: form.control, name: 'storageId' });

    const { data: infrastructure } = useInfrastructureOptions(open);
    const { items: countryOptions } = useCountries(open);
    const computes = infrastructure?.computes ?? [];
    const databases = infrastructure?.databases ?? [];
    const storages = infrastructure?.storages ?? [];

    // Hide organization creation from support users.
    if (role === 'support') {
        return null;
    }

    /** Clears the organization creation form state. */
    function resetDialogState() {
        form.reset(defaultCreateOrganizationValues);
        setError(null);
    }

    /** Updates dialog state while protecting an in-flight creation. */
    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen && createOrganization.isPending) {
            return;
        }
        setOpen(nextOpen);
        if (!nextOpen) {
            resetDialogState();
        }
    }

    return (
        <>
            <Button label={t('actions.createOrganization')} clickAction={() => setOpen(true)} />

            <Dialog
                isOpen={open}
                onOpenChange={handleOpenChange}
                purpose={createOrganization.isPending ? 'required' : 'form'}
                width={640}
                maxHeight="calc(100dvh - 2rem)"
            >
                <Layout
                    header={
                        <DialogHeader
                            title={t('createOrganization.title')}
                            subtitle={t('createOrganization.description')}
                            onOpenChange={handleOpenChange}
                        />
                    }
                    content={
                        <LayoutContent>
                            <form
                                id={formId}
                                onSubmit={form.handleSubmit(async (payload) => {
                                    setError(null);

                                    // Create the organization and close the dialog on success.
                                    try {
                                        await createOrganization.mutateAsync({
                                            name: payload.name,
                                            compute_id: payload.computeId,
                                            database_id: payload.databaseId,
                                            storage_id: payload.storageId,
                                            avatar: payload.avatar,
                                            country: payload.country,
                                        });
                                        setOpen(false);
                                        resetDialogState();
                                    } catch (mutationError) {
                                        setError(
                                            mutationError instanceof Error
                                                ? mutationError.message
                                                : t('createOrganization.error')
                                        );
                                    }
                                })}
                            >
                                <FormLayout>
                                    <Controller
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <TextInput
                                                ref={field.ref}
                                                label={t('createOrganization.nameLabel')}
                                                value={field.value}
                                                htmlName={field.name}
                                                isRequired
                                                placeholder={t('createOrganization.namePlaceholder')}
                                                onBlur={field.onBlur}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    />
                                    <Controller
                                        control={form.control}
                                        name="avatar"
                                        render={({ field }) => (
                                            <TextInput
                                                ref={field.ref}
                                                label={t('createOrganization.avatarLabel')}
                                                value={field.value}
                                                htmlName={field.name}
                                                isOptional
                                                placeholder={t('createOrganization.avatarPlaceholder')}
                                                onBlur={field.onBlur}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    />
                                    <Selector
                                        label={t('labels.country')}
                                        options={countryOptions.map((option) => ({
                                            value: option.code,
                                            label: option.name,
                                        }))}
                                        value={country}
                                        hasSearch
                                        isRequired
                                        placeholder={t('dialogs.chooseCountry')}
                                        onChange={(value) =>
                                            form.setValue('country', value, {
                                                shouldDirty: true,
                                                shouldValidate: true,
                                            })
                                        }
                                    />
                                    <Grid columns={{ minWidth: 160, max: 3, repeat: 'fit' }} gap={4}>
                                        <Selector
                                            label={t('createOrganization.computeLabel')}
                                            options={computes.map((compute) => ({
                                                value: compute.id,
                                                label: compute.name,
                                            }))}
                                            value={computeId}
                                            isRequired
                                            placeholder={t('createOrganization.computePlaceholder')}
                                            onChange={(value) =>
                                                form.setValue('computeId', value, {
                                                    shouldDirty: true,
                                                    shouldValidate: true,
                                                })
                                            }
                                        />
                                        <Selector
                                            label={t('createOrganization.databaseLabel')}
                                            options={databases.map((database) => ({
                                                value: database.id,
                                                label: database.name,
                                            }))}
                                            value={databaseId}
                                            isRequired
                                            placeholder={t('createOrganization.databasePlaceholder')}
                                            onChange={(value) =>
                                                form.setValue('databaseId', value, {
                                                    shouldDirty: true,
                                                    shouldValidate: true,
                                                })
                                            }
                                        />
                                        <Selector
                                            label={t('createOrganization.storageLabel')}
                                            options={storages.map((storage) => ({
                                                value: storage.id,
                                                label: storage.name,
                                            }))}
                                            value={storageId}
                                            isRequired
                                            placeholder={t('createOrganization.storagePlaceholder')}
                                            onChange={(value) =>
                                                form.setValue('storageId', value, {
                                                    shouldDirty: true,
                                                    shouldValidate: true,
                                                })
                                            }
                                        />
                                    </Grid>
                                    {error ? <FieldStatus type="error" message={error} variant="detached" /> : null}
                                </FormLayout>
                            </form>
                        </LayoutContent>
                    }
                    footer={
                        <LayoutFooter>
                            <Stack direction="horizontal" gap={2} justify="end">
                                <Button
                                    label={t('actions.cancel')}
                                    variant="ghost"
                                    isDisabled={createOrganization.isPending}
                                    clickAction={() => handleOpenChange(false)}
                                />
                                <Button
                                    form={formId}
                                    type="submit"
                                    label={createOrganization.isPending ? t('actions.creating') : t('actions.create')}
                                    variant="primary"
                                    isDisabled={!form.formState.isValid}
                                    isLoading={createOrganization.isPending}
                                />
                            </Stack>
                        </LayoutFooter>
                    }
                />
            </Dialog>
        </>
    );
}
