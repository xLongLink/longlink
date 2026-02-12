import { useMemo } from 'react';
import { Building2, MoreVertical } from 'lucide-react';
import { Link } from 'react-router';
import { Card } from '@/components/ui/card';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
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
import { CreateOrganizationDialog } from '@/components/dialogs/create-organization-dialog';
import { useOrgs } from '@/hooks/use-orgs';

export default function Organizations() {
    const { orgs, isLoading, isCreating, error, createOrg } = useOrgs();

    const orgCountLabel = useMemo(() => {
        if (isLoading) {
            return 'Loading organizations...';
        }
        const total = orgs.length;
        return `${total} organization${total === 1 ? '' : 's'}`;
    }, [isLoading, orgs.length]);

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
                <CreateOrganizationDialog
                    createOrg={createOrg}
                    isCreating={isCreating}
                    error={error}
                />
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
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem>
                                                        Manage modules
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        Open settings
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
