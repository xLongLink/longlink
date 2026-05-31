import Layout from '@/Layout';
import CreateOrgDialog from '@/components/dialogs/CreateOrgDialog';
import { useUser } from '@/hooks/use-user';
import { Hero, HeroAction, HeroDescription, HeroTitle } from '@ui/hero';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/table';
import { Blocks } from 'lucide-react';
import { Link } from 'react-router';

/** Renders the authenticated organizations landing page. */
export default function Organizations() {
    const { orgs, isLoading, error } = useUser();

    return (
        <Layout brandOnly brandHref="/">
            <section className="mx-auto w-full max-w-[1000px] space-y-8">
                <Hero icon={<Blocks />} className="w-full">
                    <div className="flex w-full items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <HeroTitle>Organizations</HeroTitle>
                            <HeroDescription>Manage the workspaces connected to your LongLink account.</HeroDescription>
                        </div>

                        <HeroAction>
                            <CreateOrgDialog />
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
                                        <TableCell className="text-sm text-muted-foreground">
                                            {organization.role}
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
                                    <TableCell colSpan={3} className="py-8 text-sm text-muted-foreground">
                                        No orgs found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </section>
        </Layout>
    );
}
