import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/hooks/use-user';
import { fetchApiJson } from '@/lib/api';
import { locationsQueryKey } from '@/lib/query-keys';
import type { ApiLocation } from '@/lib/types';

const COUNTRY_OPTIONS = [
    { label: 'Switzerland', value: 'CH' },
    { label: 'Germany', value: 'DE' },
    { label: 'France', value: 'FR' },
    { label: 'Italy', value: 'IT' },
    { label: 'Netherlands', value: 'NL' },
    { label: 'United Kingdom', value: 'GB' },
    { label: 'United States', value: 'US' },
];

/** Renders the admin create location dialog. */
export default function CreateLocationDialog() {
    const { role } = useUser();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [country, setCountry] = useState('CH');
    const [error, setError] = useState<string | null>(null);

    const createLocation = useMutation({
        mutationFn: async () => {
            return fetchApiJson<ApiLocation>('/api/locations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name.trim(),
                    country,
                }),
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: locationsQueryKey() });
            setOpen(false);
            setName('');
            setCountry('CH');
        },
    });

    if (role !== 'administrator') {
        return null;
    }

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
                                    placeholder="US East (N. Virginia)"
                                    autoComplete="off"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location-country">Country</Label>
                                <Select value={country} onValueChange={(value) => setCountry(value ?? 'CH')}>
                                    <SelectTrigger id="location-country" className="w-full">
                                        <SelectValue placeholder="Choose a country" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COUNTRY_OPTIONS.map((countryOption) => (
                                            <SelectItem key={countryOption.value} value={countryOption.value}>
                                                {countryOption.label}
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
                                <Button type="submit" disabled={createLocation.isPending || name.trim().length === 0}>
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
