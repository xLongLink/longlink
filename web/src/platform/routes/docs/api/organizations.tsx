import { DataTable } from '@/components/custom/data-table';
import { DocumentationArticle } from '@/components/layouts/article';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeHeading as Heading } from '@/components/custom/native-heading';
import { ArrowUp, CheckCheck, CheckCircle, EyeOff, Wrench } from 'lucide-react';

const organizationRoles = [
    { name: 'read', access: 'View organization data and access assigned resources', icon: EyeOff },
    { name: 'write', access: 'Read access plus create and update supported organization resources', icon: ArrowUp },
    {
        name: 'maintain',
        access: 'Write access plus invitations, Solution creation, previews, and runtime access',
        icon: Wrench
    },
    {
        name: 'admin',
        access: 'Full access to roles, invitations, Solutions, previews, and runtime access',
        icon: CheckCheck
    },
    {
        name: 'owner',
        access: 'Highest access to ownership, settings, members, Solutions, and resources',
        icon: CheckCircle
    }
];

const article = {
    title: 'Organizations | LongLink Platform Documentation',
    description: 'Learn how organizations manage members, Solutions, and dedicated infrastructure.',
    toc: [{ id: 'organizations', label: 'Organizations', level: 1 }],
    lastUpdated: '2026-10-18',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/api/organizations.tsx'
};

export default function Organizations() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <Heading id="organizations" level={1}>
                    Organizations
                </Heading>
                <Text as="p">
                    The organization defines the boundary for work. It manages the members and Solutions that belong to
                    it, keeping access and responsibilities clearly separated. Each organization gets its own dedicated
                    PostgreSQL database, storage bucket (S3), and compute space.
                </Text>
                <Stack as="aside" className="border-s border-accent ps-4" gap={0}>
                    <Text className="font-semibold">User permissions</Text>
                    <DataTable
                        data={organizationRoles}
                        idKey="name"
                        density="compact"
                        columns={[
                            {
                                key: 'name',
                                header: 'Roles',
                                renderCell: ({ access, icon: RoleIcon, name }) => (
                                    <Stack gap={0}>
                                        <Stack direction="horizontal" gap={2} align="center">
                                            <RoleIcon aria-hidden="true" className="text-primary" size={16} />
                                            <Text className="font-semibold capitalize">{name}</Text>
                                        </Stack>
                                        <Text className="text-xs text-muted-foreground">{access}</Text>
                                    </Stack>
                                )
                            }
                        ]}
                    />
                </Stack>
            </Stack>
        </DocumentationArticle>
    );
}
