import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiUrl, fetchApiJson } from '@/lib/api';
import type { ApiLocation } from '@/lib/types';

/** Renders the admin create location dialog. */
export default function CreateLocationDialog() {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [country, setCountry] = useState('');
    const [error, setError] = useState<string | null>(null);

    const locationUrl = apiUrl('/api/locations');

    const createLocation = useMutation({
        mutationFn: async () => {
            return fetchApiJson<ApiLocation>(locationUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    name: name.trim(),
                    display_name: displayName.trim(),
                    country: country.trim(),
                }),
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['api', locationUrl] });
            setOpen(false);
            setName('');
            setDisplayName('');
            setCountry('');
        },
    });

    return (
        <>
            <Button type="button" onClick={() => setOpen(true)}>
                Create
            </Button>

            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    setOpen(nextOpen);
                    if (!nextOpen) {
                        setError(null);
                    }
                }}
            >
                <DialogContent>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <DialogTitle>Create location</DialogTitle>
                            <DialogDescription>Add a new datacenter or cloud region.</DialogDescription>
                        </div>

                        <form
                            className="space-y-4"
                            onSubmit={async (event) => {
                                event.preventDefault();
                                setError(null);

                                try {
                                    await createLocation.mutateAsync();
                                } catch (mutationError) {
                                    setError(
                                        mutationError instanceof Error
                                            ? mutationError.message
                                            : 'Failed to create location'
                                    );
                                }
                            }}
                        >
                            <div className="space-y-2">
                                <Label htmlFor="location-name">Name</Label>
                                <Input
                                    id="location-name"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder="us-east-1"
                                    autoComplete="off"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location-display-name">Display name</Label>
                                <Input
                                    id="location-display-name"
                                    value={displayName}
                                    onChange={(event) => setDisplayName(event.target.value)}
                                    placeholder="US East (N. Virginia)"
                                    autoComplete="off"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location-country">Country</Label>
                                <Input
                                    id="location-country"
                                    value={country}
                                    onChange={(event) => setCountry(event.target.value)}
                                    placeholder="United States"
                                    autoComplete="off"
                                />
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
                                <Button type="submit" disabled={createLocation.isPending}>
                                    {createLocation.isPending ? 'Creating...' : 'Create'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
