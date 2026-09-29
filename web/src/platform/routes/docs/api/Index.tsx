import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Center } from '@astryxdesign/core/Center';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { ArrowUp, CheckCheck, CheckCircle, EyeOff, Wrench } from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';

const organizationRoles = [
    { name: 'read', access: 'View organization data and access assigned resources.', icon: EyeOff },
    {
        name: 'write',
        access: 'Read access plus create and update supported organization resources.',
        icon: ArrowUp,
    },
    {
        name: 'maintain',
        access: 'Write access plus invitations, Solution creation, previews, and runtime access.',
        icon: Wrench,
    },
    {
        name: 'admin',
        access: 'Full access to roles, invitations, Solutions, previews, and runtime access.',
        icon: CheckCheck,
    },
    {
        name: 'owner',
        access: 'Highest access to ownership, settings, members, Solutions, and resources.',
        icon: CheckCircle,
    },
];

const solutionPaths = ['Adopt', 'Branch', 'Create'];

const article = {
    description: 'Learn how the LongLink Platform manages organizations, Solutions, and shared infrastructure.',
    toc: [
        { id: 'platform', label: 'Platform', level: 1 },
        { id: 'organizations', label: 'Organizations', level: 2 },
        { id: 'users', label: 'Users', level: 3 },
        { id: 'solutions', label: 'Solutions', level: 2 },
    ],
    lastUpdated: '2026-09-28',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/api/Index.tsx',
    title: 'Platform Documentation | LongLink',
};

export default function DocsArticleRoute() {
    return (
        <Article page={article}>
            <Stack gap={5}>
                <Heading id="platform" level={1}>
                    Platform
                </Heading>
                <Text as="p">
                    The LongLink Platform provides the shared foundation for running Solutions across an organization.
                    It manages organizations, users, access, deployments, and their supporting infrastructure.
                </Text>
                <Text as="p">
                    Each Solution has its own source and purpose and runs as a separate service. LongLink provides the
                    surrounding layer: it controls access, prepares required resources, makes the service available to
                    authorized users, and provides visibility into deployments, logs, and status.
                </Text>
                <Text as="p">
                    This gives teams a consistent and governed operating model without rebuilding the same foundation
                    for every service.
                </Text>
                <Heading id="organizations" level={2}>
                    Organizations
                </Heading>
                <Text as="p">
                    Organizations are the workspace boundary in LongLink. They bring together the people, Solutions, and
                    shared resources needed to run an organization’s work. Membership determines who can access the
                    workspace, manage users, and deploy or use those Solutions.
                </Text>
                <Text as="p">
                    Each organization receives its own dedicated database, storage, and compute space. This isolation
                    gives teams a reliable environment for deploying and operating services while keeping their data
                    separate.
                </Text>
                <Heading id="users" level={3}>
                    Users
                </Heading>
                <Text as="p">
                    LongLink manages users and their access across the organization. Each Solution can access the users
                    authorized to use it.
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
                                            <Text weight="semibold">{name}</Text>
                                        </Stack>
                                        <Text type="supporting">{access}</Text>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <Heading id="solutions" level={2}>
                    Solutions
                </Heading>
                <Text as="p">
                    A Solution is a dedicated tool for running a specific part of an organization’s work. LongLink makes
                    it easy to deploy, access, and operate, so teams can focus on the process it supports.
                </Text>
                <Text as="p">
                    <Text size="lg" type="label" weight="bold">
                        Adopt
                    </Text>{' '}
                    an existing one when its process already reflects the way your organization works. LongLink provides
                    a consistent way to deploy and operate it while making it available to authorized users and
                    provisioning the resources it needs.
                </Text>
                <Text as="p">
                    <Text size="lg" type="label" weight="bold">
                        Branch
                    </Text>{' '}
                    an existing project when the underlying process is familiar but the details differ. Teams can fork
                    its Python code and adjust the workflows, rules, data model, views, and integrations to match their
                    own requirements.
                </Text>
                <Text as="p">
                    <Text size="lg" type="label" weight="bold">
                        Create
                    </Text>{' '}
                    a new one when a process needs a dedicated design from the start. Developers write its
                    process-specific logic as normal Python code, while LongLink provides the shared foundation for
                    identity, permissions, deployment, data, storage, and operations.
                </Text>
                <Grid columns={{ minWidth: 190, max: 3, repeat: 'fit' }} gap={4}>
                    {solutionPaths.map((path) => (
                        <Stack key={path} gap={2}>
                            <Card padding={0} variant="muted">
                                <Center height={190}>
                                    <Heading className="mt-0" level={3}>
                                        {path}
                                    </Heading>
                                </Center>
                            </Card>
                            <Text type="supporting">{path}</Text>
                        </Stack>
                    ))}
                </Grid>
            </Stack>
        </Article>
    );
}
