import { z } from 'zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/hooks/use-user';
import { useCreateOrganization } from '@/hooks/use-organization';
import { useCountries, useInfrastructureOptions } from '@/data/admin';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const createOrganizationSchema = z.object({
    name: z.string().trim().min(1),
    avatar: z.string().trim(),
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
    const { t } = useTranslation();
    const { role } = useUserProfile();
    const createOrganization = useCreateOrganization();
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

    return (
        <>
            <Button type="button" onClick={() => setOpen(true)}>
                {t('actions.createOrganization')}
            </Button>

            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen && createOrganization.isPending) {
                        return;
                    }
                    setOpen(nextOpen);
                    // Clear form state when the dialog closes.
                    if (!nextOpen) {
                        resetDialogState();
                    }
                }}
            >
                <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <DialogTitle>{t('createOrganization.title')}</DialogTitle>
                            <DialogDescription>{t('createOrganization.description')}</DialogDescription>
                        </div>

                        <form
                            className="space-y-4"
                            onSubmit={form.handleSubmit(async (payload) => {
                                setError(null);

                                // Create the org and close the dialog on success.
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
                            <div className="space-y-2">
                                <Label htmlFor="organization-name">{t('createOrganization.nameLabel')}</Label>
                                <Input
                                    id="organization-name"
                                    {...form.register('name')}
                                    placeholder={t('createOrganization.namePlaceholder')}
                                    autoComplete="off"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="organization-avatar">{t('createOrganization.avatarLabel')}</Label>
                                <Input
                                    id="organization-avatar"
                                    type="url"
                                    {...form.register('avatar')}
                                    placeholder={t('createOrganization.avatarPlaceholder')}
                                    autoComplete="off"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="organization-country">{t('labels.country')}</Label>
                                <Select
                                    value={country}
                                    onValueChange={(value) =>
                                        form.setValue('country', value ?? '', { shouldValidate: true })
                                    }
                                >
                                    <SelectTrigger id="organization-country" className="w-full">
                                        <SelectValue placeholder={t('dialogs.chooseCountry')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {countryOptions.map((countryOption) => (
                                            <SelectItem key={countryOption.code} value={countryOption.code}>
                                                {countryOption.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="org-compute">{t('createOrganization.computeLabel')}</Label>
                                    <Select
                                        value={computeId}
                                        onValueChange={(value) =>
                                            form.setValue('computeId', value ?? '', { shouldValidate: true })
                                        }
                                    >
                                        <SelectTrigger id="org-compute" className="w-full">
                                            <SelectValue placeholder={t('createOrganization.computePlaceholder')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {computes.map((compute) => (
                                                <SelectItem key={compute.id} value={compute.id}>
                                                    {compute.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="org-database">{t('createOrganization.databaseLabel')}</Label>
                                    <Select
                                        value={databaseId}
                                        onValueChange={(value) =>
                                            form.setValue('databaseId', value ?? '', { shouldValidate: true })
                                        }
                                    >
                                        <SelectTrigger id="org-database" className="w-full">
                                            <SelectValue placeholder={t('createOrganization.databasePlaceholder')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {databases.map((database) => (
                                                <SelectItem key={database.id} value={database.id}>
                                                    {database.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="org-storage">{t('createOrganization.storageLabel')}</Label>
                                    <Select
                                        value={storageId}
                                        onValueChange={(value) =>
                                            form.setValue('storageId', value ?? '', { shouldValidate: true })
                                        }
                                    >
                                        <SelectTrigger id="org-storage" className="w-full">
                                            <SelectValue placeholder={t('createOrganization.storagePlaceholder')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {storages.map((storage) => (
                                                <SelectItem key={storage.id} value={storage.id}>
                                                    {storage.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {error ? <p className="text-sm text-destructive">{error}</p> : null}

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={createOrganization.isPending}
                                    onClick={() => {
                                        setOpen(false);
                                        resetDialogState();
                                    }}
                                >
                                    {t('actions.cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createOrganization.isPending || !form.formState.isValid}
                                >
                                    {createOrganization.isPending ? t('actions.creating') : t('actions.create')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
