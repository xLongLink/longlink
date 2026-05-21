import Layout from '@/Layout';
import { useUser } from '@/hooks/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/dialog';
import { Hero, HeroContent, HeroDescription, HeroTitle } from '@ui/hero';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/table';
import { Blocks } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

type OrganizationCreateResponse = {
    organization: {
        name: string;
    };
};

/** Renders the authenticated organizations landing page. */
export default function Organizations() {
    const queryClient = useQueryClient();
    const { data: user, isLoading, error } = useUser();
    const [createOpen, setCreateOpen] = useState(false);
    const [name, setName] = useState('');
    const [createError, setCreateError] = useState<string | null>(null);

    // Read the organizations already attached to the shared user payload.
    const organizations = user?.organizations ?? [];

    const createOrganization = useMutation({
        mutationFn: async (organizationName: string) => {
            const response = await fetch('/api/organizations', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ name: organizationName }),
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { detail?: string } | null;

                throw new Error(payload?.detail ?? `API request failed (${response.status})`);
            }

            return (await response.json()) as OrganizationCreateResponse;
        },
        onSuccess: async () => {
            setCreateOpen(false);
            setName('');
            setCreateError(null);
            await queryClient.invalidateQueries({ queryKey: ['api', '/auth/me'] });
        },
        onError: (mutationError: Error) => {
            setCreateError(mutationError.message);
        },
    });

    return (
        <Layout tabs={{ Organizations: '/organizations', Settings: '/settings' }}>
            <section className="mx-auto w-full max-w-[1000px] space-y-8">
                <Hero icon={<Blocks />} className="w-full">
                    <div className="flex w-full items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <HeroTitle>Organizations</HeroTitle>
                            <HeroDescription>Manage the workspaces connected to your LongLink account.</HeroDescription>
                        </div>

                        <HeroContent>
                            <Button type="button" onClick={() => setCreateOpen(true)}>
                                New Organization
                            </Button>
                        </HeroContent>
                    </div>
                </Hero>

                <div className="w-full overflow-hidden rounded-2xl border border-border bg-card/80">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead className="w-32">Open</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="py-8 text-sm text-muted-foreground">
                                        Loading organizations...
                                    </TableCell>
                                </TableRow>
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="py-8 text-sm text-destructive">
                                        Failed to load organizations.
                                    </TableCell>
                                </TableRow>
                            ) : organizations.length ? (
                                organizations.map((organization) => (
                                    <TableRow key={organization.name}>
                                        <TableCell className="font-medium text-foreground">
                                            {organization.name}
                                        </TableCell>
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
                                    <TableCell colSpan={2} className="py-8 text-sm text-muted-foreground">
                                        No organizations found.
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
                        <DialogHeader>
                            <DialogTitle>New organization</DialogTitle>
                            <DialogDescription>Create a new workspace for your account.</DialogDescription>
                        </DialogHeader>

                        <form
                            className="space-y-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                setCreateError(null);
                                createOrganization.mutate(name.trim());
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

                            <DialogFooter>
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
                                    disabled={createOrganization.isPending || name.trim().length === 0}
                                >
                                    {createOrganization.isPending ? 'Creating...' : 'Create'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </section>
        </Layout>
    );
}
