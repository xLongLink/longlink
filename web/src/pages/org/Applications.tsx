import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/table';

type OrgApplication = {
    name: string;
    role: string;
};

type ApplicationsProps = {
    apps: OrgApplication[];
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
                        <TableHead className="w-32">Role</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={2} className="py-8 text-sm text-muted-foreground">
                                Loading apps...
                            </TableCell>
                        </TableRow>
                    ) : error ? (
                        <TableRow>
                            <TableCell colSpan={2} className="py-8 text-sm text-destructive">
                                Failed to load apps.
                            </TableCell>
                        </TableRow>
                    ) : apps.length ? (
                        apps.map((app) => (
                            <TableRow key={app.name}>
                                <TableCell className="font-medium text-foreground">{app.name}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{app.role}</TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={2} className="py-8 text-sm text-muted-foreground">
                                No apps found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
