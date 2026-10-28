import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Blockquote } from '@astryxdesign/core/Blockquote';
import { ArrowUp, CheckCheck, EyeOff, Wrench } from 'lucide-react';
import { DocumentationArticle } from '@/components/layouts/Article';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';

const solutionRoles = [
    { name: 'read', access: 'View Solution data and send GET requests', icon: EyeOff },
    {
        name: 'write',
        access: 'Read access plus create and update Solution data with POST, PUT, and PATCH requests',
        icon: ArrowUp,
    },
    {
        name: 'maintain',
        access: 'Write access plus DELETE requests, Solution deployment, and runtime logs',
        icon: Wrench,
    },
    { name: 'admin', access: 'Full access to Solution requests, deployment, and runtime logs', icon: CheckCheck },
];

const article = {
    title: 'Solutions | LongLink Platform Documentation',
    description: 'Learn how the Platform deploys Solutions and manages their resources and permissions.',
    toc: [{ id: 'solutions', label: 'Solutions', level: 1 }],
    lastUpdated: '2026-10-18',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/api/Solutions.tsx',
};

export default function Solutions() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <Heading id="solutions" level={1}>
                    Solutions
                </Heading>
                <Blockquote className="border-s-(--color-text-orange) text-(--color-text-orange)">
                    <Stack gap={0}>
                        <Text type="inherit">Beta notice: This page is being built.</Text>
                        <Link color="inherit" href={article.editUrl} hasUnderline isExternalLink type="inherit">
                            Edit on GitHub
                        </Link>
                    </Stack>
                </Blockquote>
                <Text as="p">
                    Solutions belong to an organization and run as separate services. The Platform manages their
                    deployment and operation. Each Solution gets its own schema in the organization’s PostgreSQL
                    database and its own dedicated prefix in the storage bucket. When not in use, Solutions
                    automatically scale to zero.
                </Text>
                <Stack as="aside" className="border-s border-accent ps-4" gap={0}>
                    <Text weight="semibold">User permissions</Text>
                    <Table density="compact">
                        <TableHeader>
                            <TableRow>
                                <TableHeaderCell>Roles</TableHeaderCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {solutionRoles.map(({ access, icon: RoleIcon, name }) => (
                                <TableRow key={name}>
                                    <TableCell>
                                        <Stack gap={0}>
                                            <Stack direction="horizontal" gap={2} align="center">
                                                <RoleIcon aria-hidden="true" className="text-accent" size={16} />
                                                <Text className="capitalize" weight="semibold">
                                                    {name}
                                                </Text>
                                            </Stack>
                                            <Text type="supporting">{access}</Text>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Stack>
            </Stack>
        </DocumentationArticle>
    );
}
