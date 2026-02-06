import { useMemo, useState } from 'react';
import { Building2, MoreVertical, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOrgs } from '@/hooks/use-orgs';

const emptyFormState = { name: '', country: '' };

export default function Organizations() {
    const { orgs, isLoading, isCreating, error, createOrg } = useOrgs();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formState, setFormState] = useState(emptyFormState);
    const [formError, setFormError] = useState<string | null>(null);

    const orgCountLabel = useMemo(() => {
        if (isLoading) {
            return 'Loading organizations...';
        }
        const total = orgs.length;
        return `${total} organization${total === 1 ? '' : 's'}`;
    }, [isLoading, orgs.length]);

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
        if (!trimmedName) {
            setFormError('Organization name is required.');
            return;
        }
        setFormError(null);
        try {
            await createOrg({
                name: trimmedName,
                country: trimmedCountry || 'US',
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
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30">
                        <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">
                            Organizations
                        </h2>
                        <p className="text-sm text-white/60">{orgCountLabel}</p>
                    </div>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                    <DialogTrigger
                        render={
                            <Button variant="outline">
                                <Plus className="h-4 w-4" />
                                New Organization
                            </Button>
                        }
                    />
                    <DialogContent className="bg-slate-950 text-white">
                        <DialogHeader>
                            <DialogTitle>Create organization</DialogTitle>
                            <DialogDescription className="text-white/60">
                                You&apos;ll be listed as the owner of this
                                organization.
                            </DialogDescription>
                        </DialogHeader>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <Label htmlFor="org-name">
                                    Organization name
                                </Label>
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
                                <Label htmlFor="org-country">
                                    Country (ISO)
                                </Label>
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
                                    className="bg-white/5 uppercase"
                                    maxLength={2}
                                />
                            </div>
                            {(formError || error) && (
                                <p className="text-sm text-red-400">
                                    {formError || error}
                                </p>
                            )}
                            <DialogFooter>
                                <Button type="submit" disabled={isCreating}>
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
            </div>

            {isLoading ? (
                <Card className="p-10 text-center">
                    <div className="flex flex-col items-center gap-3 text-sm text-white/60">
                        <Spinner className="h-5 w-5" />
                        Loading organizations...
                    </div>
                </Card>
            ) : orgs.length === 0 ? (
                <Card className="p-10 text-center">
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Building2 />
                            </EmptyMedia>
                            <EmptyTitle>No Organizations Yet</EmptyTitle>
                            <EmptyDescription>
                                Create or join an organization to start managing
                                your workspaces and projects.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                </Card>
            ) : (
                <div className="border overflow-hidden rounded">
                    <Table>
                        <TableHeader className="bg-muted/40 border-b">
                            <TableRow>
                                <TableHead>Organization</TableHead>
                                <TableHead>Country</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">
                                    Action
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orgs.map((org) => {
                                const createdAt = org.date_creation
                                    ? new Date(
                                        org.date_creation
                                    ).toLocaleDateString()
                                    : 'Unknown date';
                                const orgCountry =
                                    org.country?.toLowerCase() || 'us';
                                const orgSlug = encodeURIComponent(org.name);
                                const orgBasePath = `/${orgCountry}/${orgSlug}`;
                                return (
                                    <TableRow key={org.id}>
                                        <TableCell className="font-semibold text-white">
                                            <Link
                                                to={orgBasePath}
                                                className="transition-colors hover:underline underline-offset-4"
                                            >
                                                {org.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-white/60">
                                            {org.country || 'No country set'}
                                        </TableCell>
                                        <TableCell className="text-white/60">
                                            {createdAt}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30">
                                                    <MoreVertical className="h-4 w-4" />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    align="end"
                                                    className="w-64 p-2"
                                                >
                                                    <DropdownMenuItem className="cursor-pointer transition-colors hover:bg-white/10 p-2">
                                                        <Link
                                                            to={orgBasePath}
                                                            className="flex w-full items-center"
                                                        >
                                                            Overview
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="cursor-pointer transition-colors hover:bg-white/10 p-2">
                                                        <Link
                                                            to={`${orgBasePath}/people`}
                                                            className="flex w-full items-center"
                                                        >
                                                            Members
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="cursor-pointer transition-colors hover:bg-white/10 p-2">
                                                        <Link
                                                            to={`${orgBasePath}/settings`}
                                                            className="flex w-full items-center"
                                                        >
                                                            Settings
                                                        </Link>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
