import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { CreateOrganizationPayload } from '@/hooks/use-orgs';

const emptyFormState = { name: '', country: '', crn: '', vat: '' };

type CreateOrganizationDialogProps = {
    createOrg: (payload: CreateOrganizationPayload) => Promise<unknown>;
    isCreating: boolean;
    error: string | null;
};

export function CreateOrganizationDialog({
    createOrg,
    isCreating,
    error,
}: CreateOrganizationDialogProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formState, setFormState] = useState(emptyFormState);
    const [formError, setFormError] = useState<string | null>(null);

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (open) {
            setFormState(emptyFormState);
            setFormError(null);
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        const trimmedName = formState.name.trim();
        const trimmedCountry = formState.country.trim();
        const trimmedCrn = formState.crn.trim();
        const trimmedVat = formState.vat.trim();
        if (!trimmedName) {
            setFormError('Organization name is required.');
            return;
        }
        setFormError(null);
        try {
            await createOrg({
                name: trimmedName,
                country: trimmedCountry || 'US',
                crn: trimmedCrn || undefined,
                vat: trimmedVat || undefined,
            });
            setIsDialogOpen(false);
        } catch (err) {
            setFormError(
                err instanceof Error
                    ? err.message
                    : 'Unable to create organization.'
            );
        }
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger
                render={
                    <Button variant="outline" className="cursor-pointer">
                        <Plus className="h-4 w-4" />
                        New Organization
                    </Button>
                }
            />
            <DialogContent className="text-white">
                <DialogHeader>
                    <DialogTitle>Create organization</DialogTitle>
                    <DialogDescription className="text-white/60">
                        You&apos;ll be listed as the owner of this organization.
                    </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <Label htmlFor="org-name">Organization name</Label>
                        <Input
                            id="org-name"
                            value={formState.name}
                            onChange={(event) =>
                                setFormState((prev) => ({
                                    ...prev,
                                    name: event.target.value,
                                }))
                            }
                            placeholder="Acme Studio"
                            className="bg-white/5"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="org-country">Country (ISO)</Label>
                        <Input
                            id="org-country"
                            value={formState.country}
                            onChange={(event) =>
                                setFormState((prev) => ({
                                    ...prev,
                                    country: event.target.value,
                                }))
                            }
                            placeholder="US"
                            maxLength={2}
                            className="bg-white/5 uppercase"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="org-crn">CRN</Label>
                        <Input
                            id="org-crn"
                            value={formState.crn}
                            onChange={(event) =>
                                setFormState((prev) => ({
                                    ...prev,
                                    crn: event.target.value,
                                }))
                            }
                            placeholder="Company Registration Number"
                            className="bg-white/5"
                            maxLength={25}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="org-vat">VAT</Label>
                        <Input
                            id="org-vat"
                            value={formState.vat}
                            onChange={(event) =>
                                setFormState((prev) => ({
                                    ...prev,
                                    vat: event.target.value,
                                }))
                            }
                            placeholder="Value Added Tax"
                            className="bg-white/5"
                            maxLength={25}
                        />
                    </div>
                    {(formError || error) && (
                        <p className="text-sm text-red-400">
                            {formError || error}
                        </p>
                    )}
                    <DialogFooter>
                        <DialogClose
                            render={
                                <Button
                                    variant="outline"
                                    type="button"
                                    className="cursor-pointer"
                                />
                            }
                        >
                            Cancel
                        </DialogClose>
                        <Button
                            type="submit"
                            disabled={isCreating}
                            className="cursor-pointer"
                        >
                            {isCreating ? (
                                <>
                                    <Spinner className="mr-2" />
                                    Creating...
                                </>
                            ) : (
                                'Create organization'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
