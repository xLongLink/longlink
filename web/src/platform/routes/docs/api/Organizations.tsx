import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { ArrowUp, CheckCheck, CheckCircle, EyeOff, Wrench } from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';
import { publicSeoMeta } from '@/lib/seo';
import { Article } from '@/components/layouts/Article';

const organizationRoles = [
    { name: 'read', access: 'View organization data and access assigned resources.', icon: EyeOff },
    {
        name: 'write',
        access: 'Read access plus create and update supported organization resources.',
        icon: ArrowUp,
    },
    {
        name: 'maintain',
        access: 'Write access plus invitations, application creation, previews, and runtime access.',
        icon: Wrench,
    },
    {
        name: 'admin',
        access: 'Full access to roles, invitations, applications, previews, and runtime access.',
        icon: CheckCheck,
    },
    {
        name: 'owner',
        access: 'Highest access to ownership, settings, members, applications, and resources.',
        icon: CheckCircle,
    },
];

export const metadata = {
    path: '/docs/api/organizations',
    title: 'Organizations',
    description: 'Learn how LongLink organizations, memberships, and access boundaries work.',
    toc: [
        { id: 'organizations', label: 'Organizations', level: 1 },
        { id: 'users', label: 'Users', level: 2 },
    ],
    lastUpdated: '2026-07-25',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/api/Organizations.tsx',
};

export const meta = () => publicSeoMeta(metadata);

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Heading id="organizations" level={1}>
                    Organizations
                </Heading>
                <Text as="p">
                    Organizations are the workspace boundary in LongLink. They bring together the people, applications,
                    and shared resources needed to run an organization’s work, while membership determines who can
                    access the workspace, manage users, deploy applications, and use the applications within it.
                </Text>
                <Text as="p">
                    Each organization receives its own dedicated database, storage, and compute space. This keeps its
                    applications and operational data separate, giving teams a clear and reliable environment in which
                    to deploy, run, and evolve their applications.
                </Text>
                <Heading id="users" level={2}>
                    Users
                </Heading>
                <Text as="p">
                    LongLink manages users and their access across the organization. Applications can access the users
                    authorized to use them.
                </Text>
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
                                    <Stack gap={1}>
                                        <Stack direction="horizontal" gap={2} align="center">
                                            <RoleIcon aria-hidden="true" className="text-accent" size={16} />
                                            <Text type="body" weight="semibold">
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
        </Article>
    );
}
