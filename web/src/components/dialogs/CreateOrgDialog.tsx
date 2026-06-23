import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { useCreateOrg } from '@/hooks/use-org';
import { useUser } from '@/hooks/use-user';
import { apiUrl, fetchApiJson } from '@/lib/api';
import type { ApiLocation } from '@/lib/types';

/** Renders the create-organization dialog. */
export default function CreateOrgDialog() {
    const { role } = useUser();
    const createOrg = useCreateOrg();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState('');
    const [locationId, setLocationId] = useState('');
    const [error, setError] = useState<string | null>(null);

    const locationsUrl = apiUrl('/api/locations');

    const locationsQuery = useQuery({
        queryKey: ['api', locationsUrl],
        queryFn: async () => fetchApiJson<Array<ApiLocation>>(locationsUrl, { credentials: 'include' }),
        retry: false,
    });

    const selectedLocationName = locationsQuery.data?.find((location) => location.id === locationId)?.name;

    if (role === 'support') {
        return null;
    }

    return (
        <>
            <Button type="button" onClick={() => setOpen(true)}>
                Create Organization
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
                            <DialogTitle>New organization</DialogTitle>
                            <DialogDescription>Create a new workspace for your account.</DialogDescription>
                        </div>

                        <form
                            className="space-y-4"
                            onSubmit={async (event) => {
                                event.preventDefault();
                                setError(null);

                                // Create the org and close the dialog on success.
                                try {
                                    await createOrg.mutateAsync({
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
                                        mutationError instanceof Error ? mutationError.message : 'Failed to create org'
                                    );
                                }
                            }}
                        >
                            <div className="space-y-2">
                                <Label htmlFor="organization-name">Name</Label>
                                <Input
                                    id="organization-name"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder="Example LongLink"
                                    autoComplete="off"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="organization-avatar">Avatar URL</Label>
                                <Input
                                    id="organization-avatar"
                                    type="url"
                                    value={avatar}
                                    onChange={(event) => setAvatar(event.target.value)}
                                    placeholder="https://example.com/org.png"
                                    autoComplete="off"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="org-location">Location</Label>
                                <Select value={locationId} onValueChange={(value) => setLocationId(value ?? '')}>
                                    <SelectTrigger id="org-location" className="w-full">
                                        {selectedLocationName ?? 'Choose a location'}
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locationsQuery.data?.map((location) => (
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
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createOrg.isPending || name.trim().length === 0 || !locationId}
                                >
                                    {createOrg.isPending ? 'Creating...' : 'Create'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
