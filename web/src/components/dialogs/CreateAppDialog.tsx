import { useCreateApp } from '@/hooks/use-org';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

type CreateAppDialogProps = {
    org: string;
};

/** Renders the create-application dialog for an organization. */
export default function CreateAppDialog({ org }: CreateAppDialogProps) {
    const createApp = useCreateApp(org);
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [image, setImage] = useState('');
    const [error, setError] = useState<string | null>(null);

    return (
        <>
            <Button type="button" onClick={() => setOpen(true)} disabled={org.length === 0}>
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
                            <DialogTitle>New app</DialogTitle>
                            <DialogDescription>Create a new application in this organization.</DialogDescription>
                        </div>

                        <form
                            className="space-y-4"
                            onSubmit={async (event) => {
                                event.preventDefault();
                                setError(null);

                                // Submit the new app and close the dialog on success.
                                try {
                                    await createApp.mutateAsync({
                                        name: name.trim(),
                                        image: image.trim(),
                                    });
                                    setOpen(false);
                                    setName('');
                                    setImage('');
                                } catch (mutationError) {
                                    setError(mutationError instanceof Error ? mutationError.message : 'Failed to create app');
                                }
                            }}
                        >
                            <div className="space-y-2">
                                <Label htmlFor="application-name">Name</Label>
                                <Input
                                    id="application-name"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder="dashboard"
                                    autoComplete="off"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="application-image">Image</Label>
                                <Input
                                    id="application-image"
                                    value={image}
                                    onChange={(event) => setImage(event.target.value)}
                                    placeholder="ghcr.io/longlink/dashboard:latest"
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
                                <Button
                                    type="submit"
                                    disabled={createApp.isPending || name.trim().length === 0 || image.trim().length === 0}
                                >
                                    {createApp.isPending ? 'Creating...' : 'Create'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
