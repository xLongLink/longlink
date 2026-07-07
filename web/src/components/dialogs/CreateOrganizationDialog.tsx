import { useTranslation } from '@/lib/i18n';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { useLocations } from '@/data/admin';
import { useCreateOrganization } from '@/hooks/use-organization';
import { useUserProfile } from '@/hooks/use-user';

/** Renders the create-organization dialog. */
export default function CreateOrganizationDialog() {
    const { t } = useTranslation();
    const { role } = useUserProfile();
    const createOrganization = useCreateOrganization();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState('');
    const [locationId, setLocationId] = useState('');
    const [error, setError] = useState<string | null>(null);

    const { items: locations } = useLocations(open);

    const selectedLocationName = locations.find((location) => location.id === locationId)?.name;

    if (role === 'support') {
        return null;
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
                    if (!nextOpen) {
                        setError(null);
                        setAvatar('');
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
                            onSubmit={async (event) => {
                                event.preventDefault();
                                setError(null);

                                // Create the org and close the dialog on success.
                                try {
                                    await createOrganization.mutateAsync({
                                        name: name.trim(),
                                        location_id: locationId,
                                        avatar: avatar.trim(),
                                    });
                                    setOpen(false);
                                    setName('');
                                    setAvatar('');
                                    setLocationId('');
                                } catch (mutationError) {
                                    setError(
                                        mutationError instanceof Error
                                            ? mutationError.message
                                            : t('createOrganization.error')
                                    );
                                }
                            }}
                        >
                            <div className="space-y-2">
                                <Label htmlFor="organization-name">{t('createOrganization.nameLabel')}</Label>
                                <Input
                                    id="organization-name"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder={t('createOrganization.namePlaceholder')}
                                    autoComplete="off"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="organization-avatar">{t('createOrganization.avatarLabel')}</Label>
                                <Input
                                    id="organization-avatar"
                                    type="url"
                                    value={avatar}
                                    onChange={(event) => setAvatar(event.target.value)}
                                    placeholder={t('createOrganization.avatarPlaceholder')}
                                    autoComplete="off"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="org-location">{t('createOrganization.locationLabel')}</Label>
                                <Select value={locationId} onValueChange={(value) => setLocationId(value ?? '')}>
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
                                        setError(null);
                                    }}
                                >
                                    {t('actions.cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createOrganization.isPending || name.trim().length === 0 || !locationId}
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
