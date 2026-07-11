import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useTranslation } from '@/lib/i18n';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCountries, useLocations } from '@/data/admin';
import { useCreateOrganization } from '@/hooks/use-organization';
import { useUserProfile } from '@/hooks/use-user';

const createOrganizationSchema = z.object({
    name: z.string().trim().min(1),
    avatar: z.string().trim(),
    country: z.string().length(2),
    locationId: z.string().min(1),
});

type CreateOrganizationInput = z.input<typeof createOrganizationSchema>;
type CreateOrganizationValues = z.output<typeof createOrganizationSchema>;

const defaultCreateOrganizationValues = {
    name: '',
    avatar: '',
    country: 'CH',
    locationId: '',
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
    const values = form.watch();

    const { items: locations } = useLocations(open);
    const { items: countryOptions } = useCountries(open);

    const selectedLocationName = locations.find((location) => location.id === values.locationId)?.name;

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
                    setOpen(nextOpen);
                    // Clear form state when the dialog closes.
                    if (!nextOpen) {
                        resetDialogState();
                    }
                }}
            >
                <DialogContent>
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
                                        location_id: payload.locationId,
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
                                    value={values.country}
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

                            <div className="space-y-2">
                                <Label htmlFor="org-location">{t('createOrganization.locationLabel')}</Label>
                                <Select
                                    value={values.locationId}
                                    onValueChange={(value) =>
                                        form.setValue('locationId', value ?? '', { shouldValidate: true })
                                    }
                                >
                                    <SelectTrigger id="org-location" className="w-full">
                                        {selectedLocationName ?? t('createOrganization.locationPlaceholder')}
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locations.map((location) => (
                                            <SelectItem key={location.id} value={String(location.id)}>
                                                {location.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {error ? <p className="text-sm text-destructive">{error}</p> : null}

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
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
