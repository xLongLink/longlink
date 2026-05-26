import { useCreateOrg } from '@/hooks/use-org';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

/** Renders the create-organization dialog. */
export default function CreateOrgDialog() {
    const createOrg = useCreateOrg();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);

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
                                    await createOrg.mutateAsync(name.trim());
                                    setOpen(false);
                                    setName('');
                                } catch (mutationError) {
                                    setError(mutationError instanceof Error ? mutationError.message : 'Failed to create org');
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
                                <Button type="submit" disabled={createOrg.isPending || name.trim().length === 0}>
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
