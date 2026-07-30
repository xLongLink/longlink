import { Stack } from '@astryxdesign/core/Stack';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** Renders the SDK backend selected for each runtime environment. */
export function EnvironmentTable({
    environments,
}: {
    environments: { backend: ReactNode; icon: LucideIcon; name: string }[];
}) {
    return (
        <Table<Record<string, unknown>> density="compact">
            <TableHeader>
                <TableRow>
                    <TableHeaderCell>Environment</TableHeaderCell>
                </TableRow>
            </TableHeader>
            <TableBody>
                {environments.map(({ backend, icon: EnvironmentIcon, name }) => (
                    <TableRow key={name}>
                        <TableCell>
                            <Stack gap={1}>
                                <Stack direction="horizontal" gap={2} align="center">
                                    <EnvironmentIcon aria-hidden="true" className="text-accent" size={16} />
                                    <Text weight="semibold">{name}</Text>
                                </Stack>
                                <Text type="supporting">{backend}</Text>
                            </Stack>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
