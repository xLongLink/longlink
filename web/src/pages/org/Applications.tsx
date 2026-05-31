import { Link } from 'react-router';

import type { ApiOrgApp } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/table';

type ApplicationsProps = {
    org: string;
    apps: ApiOrgApp[];
    isLoading: boolean;
    error: Error | null;
};

/** Renders the organization applications table. */
export default function Applications({ org, apps, isLoading, error }: ApplicationsProps) {
    return (
        <div className="w-full overflow-hidden rounded-2xl border border-border bg-card/80">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>App</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={1} className="py-8 text-sm text-muted-foreground">
                                Loading apps...
                            </TableCell>
                        </TableRow>
                    ) : error ? (
                        <TableRow>
                            <TableCell colSpan={1} className="py-8 text-sm text-destructive">
                                Failed to load apps.
                            </TableCell>
                        </TableRow>
                    ) : apps.length ? (
                        apps.map((app) => (
                            <TableRow key={app.name}>
                                <TableCell className="font-medium text-foreground">
                                    <Link to={`/${org}/${app.name}`} className="hover:underline">
                                        {app.name}
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={1} className="py-8 text-sm text-muted-foreground">
                                No apps found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
