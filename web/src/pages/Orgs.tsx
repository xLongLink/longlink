import Layout from '@/Layout';
import { useUser, type User } from '@/hooks/use-user';
import { apiUrl } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@ui/dialog';
import { Hero, HeroAction, HeroDescription, HeroTitle } from '@ui/hero';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/table';
import { Blocks } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

type OrgCreateResponse = {
    org: {
        name: string;
    };
};

type ApiUser = User & {
    orgs?: {
        name: string;
    }[];
};

/** Renders the authenticated orgs landing page. */
export default function Orgs() {
    const queryClient = useQueryClient();
    const { data: user, isLoading, error } = useUser();
    const [createOpen, setCreateOpen] = useState(false);
    const [name, setName] = useState('');
    const [createError, setCreateError] = useState<string | null>(null);

    // Read the orgs already attached to the shared user payload.
    const orgs = user?.orgs ?? [];
    const orgsUrl = apiUrl('/api/orgs');
    const userUrl = apiUrl('/api/me');

    const createOrg = useMutation({
        mutationFn: async (orgName: string) => {
            const response = await fetch(orgsUrl, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ name: orgName }),
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { detail?: string } | null;

                throw new Error(payload?.detail ?? `API request failed (${response.status})`);
            }

            return (await response.json()) as OrgCreateResponse;
        },
        onSuccess: async () => {
            // Add the new org to the cached user so the list updates immediately.
            queryClient.setQueryData<ApiUser | null>(['api', userUrl], (current) => {
                if (!current) {
                    return current;
                }

                const org = { name: name.trim() };
                const orgs = current.orgs ?? [];

                if (orgs.some((existingOrg) => existingOrg.name === org.name)) {
                    return current;
                }

                return {
                    ...current,
                    orgs: [...orgs, org],
                };
            });

            setCreateOpen(false);
            setName('');
            setCreateError(null);
            await queryClient.invalidateQueries({ queryKey: ['api', userUrl] });
        },
        onError: (mutationError: Error) => {
            setCreateError(mutationError.message);
        },
    });

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
                                <TableHead className="w-32">Open</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="py-8 text-sm text-muted-foreground">
                                        Loading orgs...
                                    </TableCell>
                                </TableRow>
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="py-8 text-sm text-destructive">
                                        Failed to load orgs.
                                    </TableCell>
                                </TableRow>
                            ) : orgs.length ? (
                                orgs.map((organization) => (
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
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    setCreateError(null);
                                    createOrg.mutate(name.trim());
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
