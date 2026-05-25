import Layout from '@/Layout';
import { useCreateOrg } from '@/hooks/use-org';
import { useUser } from '@/hooks/use-user';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@ui/dialog';
import { Hero, HeroAction, HeroDescription, HeroTitle } from '@ui/hero';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/table';
import { Blocks } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

/** Renders the authenticated organizations landing page. */
export default function Organizations() {
    const { orgs, isLoading, error } = useUser();
    const createOrg = useCreateOrg();
    const [createOpen, setCreateOpen] = useState(false);
    const [name, setName] = useState('');
    const [createError, setCreateError] = useState<string | null>(null);

    return (
        <Layout brandOnly>
            <section className="mx-auto w-full max-w-[1000px] space-y-8">
                <Hero icon={<Blocks />} className="w-full">
                    <div className="flex w-full items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <HeroTitle>Orgs</HeroTitle>
                            <HeroDescription>Manage the workspaces connected to your LongLink account.</HeroDescription>
                        </div>

                        <HeroAction>
                            <Button type="button" onClick={() => setCreateOpen(true)}>
                                New Org
                            </Button>
                        </HeroAction>
                    </div>
                </Hero>

                <div className="w-full overflow-hidden rounded-2xl border border-border bg-card/80">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead className="w-32">Role</TableHead>
                                <TableHead className="w-32">Open</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="py-8 text-sm text-muted-foreground">
                                        Loading orgs...
                                    </TableCell>
                                </TableRow>
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="py-8 text-sm text-destructive">
                                        Failed to load orgs.
                                    </TableCell>
                                </TableRow>
                            ) : orgs.length ? (
                                orgs.map((organization) => (
                                    <TableRow key={organization.name}>
                                        <TableCell className="font-medium text-foreground">
                                            {organization.name}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{organization.role}</TableCell>
                                        <TableCell>
                                            <Link
                                                to={`/${organization.name}`}
                                                className="text-sm text-accent hover:underline"
                                            >
                                                Open
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="py-8 text-sm text-muted-foreground">
                                        No orgs found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Dialog
                    open={createOpen}
                    onOpenChange={(open) => {
                        setCreateOpen(open);
                        if (!open) {
                            setCreateError(null);
                        }
                    }}
                >
                    <DialogContent>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <DialogTitle>New org</DialogTitle>
                                <DialogDescription>Create a new workspace for your account.</DialogDescription>
                            </div>

                            <form
                                className="space-y-4"
                                onSubmit={async (event) => {
                                    event.preventDefault();
                                    setCreateError(null);

                                    try {
                                        await createOrg.mutateAsync(name.trim());
                                        setCreateOpen(false);
                                        setName('');
                                    } catch (mutationError) {
                                        setCreateError(
                                            mutationError instanceof Error
                                                ? mutationError.message
                                                : 'Failed to create org'
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

                                {createError ? <p className="text-sm text-destructive">{createError}</p> : null}

                                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setCreateOpen(false);
                                            setCreateError(null);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={createOrg.isPending || name.trim().length === 0}
                                    >
                                        {createOrg.isPending ? 'Creating...' : 'Create'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </DialogContent>
                </Dialog>
            </section>
        </Layout>
    );
}
