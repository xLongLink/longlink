import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Blockquote } from '@astryxdesign/core/Blockquote';
import { DocumentationArticle } from '@/components/layouts/Article';
import { ArrowUp, CheckCheck, CheckCircle, EyeOff, Wrench } from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';

const organizationRoles = [
    { name: 'read', access: 'View organization data and access assigned resources', icon: EyeOff },
    { name: 'write', access: 'Read access plus create and update supported organization resources', icon: ArrowUp },
    {
        name: 'maintain',
        access: 'Write access plus invitations, Solution creation, previews, and runtime access',
        icon: Wrench,
    },
    {
        name: 'admin',
        access: 'Full access to roles, invitations, Solutions, previews, and runtime access',
        icon: CheckCheck,
    },
    {
        name: 'owner',
        access: 'Highest access to ownership, settings, members, Solutions, and resources',
        icon: CheckCircle,
    },
];

const article = {
    title: 'Organizations | LongLink Platform Documentation',
    description: 'Learn how organizations manage members, Solutions, and dedicated infrastructure.',
    toc: [{ id: 'organizations', label: 'Organizations', level: 1 }],
    lastUpdated: '2026-10-18',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/api/Organizations.tsx',
};

export default function Organizations() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <Heading id="organizations" level={1}>
                    Organizations
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
                    The organization defines the boundary for work. It manages the members and Solutions that belong to
                    it, keeping access and responsibilities clearly separated. Each organization gets its own dedicated
                    PostgreSQL database, storage bucket (S3), and compute space.
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
                            {organizationRoles.map(({ access, icon: RoleIcon, name }) => (
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
