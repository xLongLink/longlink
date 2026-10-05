import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { Blockquote } from '@astryxdesign/core/Blockquote';
import { ArrowUp, CheckCheck, CheckCircle, EyeOff, Wrench } from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';

const organizationRoles = [
    { name: 'read', access: 'View organization data and access assigned resources', icon: EyeOff },
    {
        name: 'write',
        access: 'Read access plus create and update supported organization resources',
        icon: ArrowUp,
    },
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
    description: 'Learn how the LongLink Platform manages organizations, Solutions, and shared infrastructure.',
    toc: [
        { id: 'platform', label: 'Platform', level: 1 },
        { id: 'organizations', label: 'Organizations', level: 2 },
        { id: 'solutions', label: 'Solutions', level: 2 },
    ],
    lastUpdated: '2026-09-28',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/api/Index.tsx',
    title: 'Platform Documentation | LongLink',
};

/** Renders the same permission table for organization and Solution roles. */
function RoleTable({ roles }: { roles: Readonly<typeof organizationRoles> }) {
    return (
        <Table density="compact">
            <TableHeader>
                <TableRow>
                    <TableHeaderCell>Roles</TableHeaderCell>
                </TableRow>
            </TableHeader>
            <TableBody>
                {roles.map(({ access, icon: RoleIcon, name }) => (
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
    );
}

export default function DocsArticleRoute() {
    return (
        <Article page={article}>
            <Stack gap={5}>
                <Heading id="platform" level={1}>
                    Platform
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
                    The Platform exists to keep an organization’s processes and data in a single place. This keeps both
                    the work and the information organized: work is done locally, while the cloud provides validation
                    and stores data in a consistent structure. This makes processes easier to review, manage, and
                    improve over time.
                </Text>
                <Heading id="organizations" level={2}>
                    Organizations
                </Heading>
                <Text as="p">
                    The organization defines the boundary for work. It manages the members and Solutions that belong to
                    it, keeping access and responsibilities clearly separated. Each organization gets its own dedicated
                    PostgreSQL database, storage bucket (S3), and compute space.
                </Text>
                <Stack as="aside" className="border-s border-accent ps-4" gap={0}>
                    <Text weight="semibold">User permissions</Text>
                    <RoleTable roles={organizationRoles} />
                </Stack>
                <Heading id="solutions" level={2}>
                    Solutions
                </Heading>
                <Text as="p">
                    Solutions belong to an organization and run as separate services. The Platform manages their
                    deployment and operation. Each Solution gets its own schema in the organization’s PostgreSQL
                    database and its own dedicated prefix in the storage bucket. When not in use, Solutions
                    automatically scale to zero.
                </Text>
                <Stack as="aside" className="border-s border-accent ps-4" gap={0}>
                    <Text weight="semibold">User permissions</Text>
                    <RoleTable roles={solutionRoles} />
                </Stack>
            </Stack>
        </Article>
    );
}
