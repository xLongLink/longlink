import Layout from '@/Layout';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/dialog';
import { Hero, HeroContent, HeroDescription, HeroTitle } from '@ui/hero';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/table';
import { Blocks } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

type OrganizationsResponse = {
    items: {
        name: string;
    }[];
};

type OrganizationCreateResponse = {
    organization: {
        name: string;
    };
};

/** Renders the authenticated organizations landing page. */
export default function Organizations() {
    const queryClient = useQueryClient();
    const [createOpen, setCreateOpen] = useState(false);
    const [name, setName] = useState('');
    const [createError, setCreateError] = useState<string | null>(null);

    // Load the organizations visible to the current user.
    const { data, isLoading, error } = useQuery({
        queryKey: ['api', '/api/user/organizations'],
        queryFn: async () => {
            const response = await fetch('/api/user/organizations', {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`API request failed (${response.status})`);
            }

            return (await response.json()) as OrganizationsResponse;
        },
    });

    const createOrganization = useMutation({
        mutationFn: async () => {
            const response = await fetch('/api/organizations', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ name }),
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
            await queryClient.invalidateQueries({ queryKey: ['api', '/api/user/organizations'] });
        },
        onError: (mutationError: Error) => {
            setCreateError(mutationError.message);
        },
    });

    return (
        <Layout tabs={{ Organizations: '/organizations', Settings: '/settings' }}>
            <section className="space-y-8">
                <Hero icon={<Blocks />} className="w-full">
                    <div className="flex w-full items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <HeroTitle>Organizations</HeroTitle>
                            <HeroDescription>Manage the workspaces connected to your LongLink account.</HeroDescription>
                        </div>

                        <HeroContent>
                            <Button type="button" onClick={() => setCreateOpen(true)}>
                                Create
                            </Button>
                        </HeroContent>
                    </div>
                </Hero>

                <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5">
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
                                    <TableCell colSpan={2} className="py-8 text-sm text-white/60">
                                        Loading organizations...
                                    </TableCell>
                                </TableRow>
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="py-8 text-sm text-red-300">
                                        Failed to load organizations.
                                    </TableCell>
                                </TableRow>
                            ) : data?.items?.length ? (
                                data.items.map((organization) => (
                                    <TableRow key={organization.name}>
                                        <TableCell className="font-medium text-white">{organization.name}</TableCell>
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
                                    <TableCell colSpan={2} className="py-8 text-sm text-white/60">
                                        No organizations found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create organization</DialogTitle>
                            <DialogDescription>Enter a name for the new organization.</DialogDescription>
                        </DialogHeader>

                        <form
                            className="space-y-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                setCreateError(null);
                                createOrganization.mutate();
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

                            {createError ? <p className="text-sm text-red-300">{createError}</p> : null}

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
