import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/table';
import type { ApiOrgApp } from '@/lib/types';

type ApplicationsProps = {
    apps: ApiOrgApp[];
    isLoading: boolean;
    error: Error | null;
};

/** Renders the organization applications table. */
export default function Applications({ apps, isLoading, error }: ApplicationsProps) {
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
                                <TableCell className="font-medium text-foreground">{app.name}</TableCell>
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
