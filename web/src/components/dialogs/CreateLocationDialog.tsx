import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCountries } from '@/data/admin';
import { useUserProfile } from '@/hooks/use-user';
import { apiLocationSchema, parseApiResponse } from '@/lib/api-schemas';
import { fetchApiJson } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { locationsQueryKey } from '@/lib/query-keys';
import type { ApiLocation } from '@/lib/types';

const createLocationSchema = z.object({
    name: z.string().trim().min(1),
    country: z.string().length(2),
});

type CreateLocationInput = z.input<typeof createLocationSchema>;
type CreateLocationValues = z.output<typeof createLocationSchema>;

const defaultCreateLocationValues = {
    name: '',
    country: 'CH',
} satisfies CreateLocationInput;

/** Renders the admin create location dialog. */
export default function CreateLocationDialog() {
    const { t } = useTranslation();
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const form = useForm<CreateLocationInput, unknown, CreateLocationValues>({
        defaultValues: defaultCreateLocationValues,
        mode: 'onChange',
        resolver: zodResolver(createLocationSchema),
    });
    const values = form.watch();
    const { items: countryOptions } = useCountries(open);

    const createLocation = useMutation({
        mutationFn: async (payload: CreateLocationValues) => {
            return fetchApiJson<ApiLocation>(
                '/api/locations',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: payload.name,
                        country: payload.country,
                    }),
                },
                (value) => parseApiResponse(apiLocationSchema, value)
            );
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: locationsQueryKey() });
            setOpen(false);
            resetDialogState();
        },
    });

    // Restrict location creation to administrators.
    if (role !== 'administrator') {
        return null;
    }

    /** Clears the location creation form state. */
    function resetDialogState() {
        form.reset(defaultCreateLocationValues);
        setError(null);
    }

    return (
        <>
            <Button type="button" onClick={() => setOpen(true)}>
                {t('actions.create')}
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
                            <DialogTitle>{t('dialogs.createLocationTitle')}</DialogTitle>
                            <DialogDescription>{t('dialogs.createLocationDescription')}</DialogDescription>
                        </div>

                        <form
                            className="space-y-4"
                            onSubmit={form.handleSubmit(async (payload) => {
                                setError(null);

                                // Submit the location and let success handlers close the dialog.
                                try {
                                    await createLocation.mutateAsync(payload);
                                } catch (mutationError) {
                                    setError(
                                        mutationError instanceof Error
                                            ? mutationError.message
                                            : t('dialogs.createLocationFailed')
                                    );
                                }
                            })}
                        >
                            <div className="space-y-2">
                                <Label htmlFor="location-name">{t('labels.name')}</Label>
                                <Input
                                    id="location-name"
                                    {...form.register('name')}
                                    placeholder="US East (N. Virginia)"
                                    autoComplete="off"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location-country">{t('labels.country')}</Label>
                                <Select
                                    value={values.country}
                                    onValueChange={(value) =>
                                        form.setValue('country', value ?? '', { shouldValidate: true })
                                    }
                                >
                                    <SelectTrigger id="location-country" className="w-full">
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
                                <Button type="submit" disabled={createLocation.isPending || !form.formState.isValid}>
                                    {createLocation.isPending ? t('actions.creating') : t('actions.create')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
