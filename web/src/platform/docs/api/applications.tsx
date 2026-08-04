import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Columns, Copy, Wrench } from 'lucide-react';
import { DocsBanner } from '@/components/DocsBanner';

const runtimeResources = [
    { name: 'Database', icon: Columns, description: ['Dedicated schema', 'Read access from shared'] },
    { name: 'File Storage', icon: Copy, description: ['Application prefix', 'Read access to shared prefix'] },
    { name: 'Infrastructure', icon: Wrench, description: ['Versioned runtime', 'Managed environment'] },
];

export const metadata = {
    toc: [
        { id: 'applications', label: 'Applications', level: 1 },
        { id: 'access', label: 'Access', level: 2 },
    ],
    lastUpdated: '2026-07-27',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/api/applications.tsx',
};

export const content = (
    <Stack gap={5}>
        <DocsBanner variant="applications" />
        <Heading id="applications" level={1}>
            Applications
        </Heading>
        <Text as="p">
            Applications are containerized LongLink SDK services deployed into an organization. The LongLink Platform
            reads application metadata from the image, provisions runtime resources, verifies the rollout, and routes
            authenticated users to the running service.
        </Text>
        <Text as="p">
            In production, each application receives database and storage access scoped to organization resources. The
            runtime can read and write its own application schema and its application prefix in the Organization bucket.
            It can read the shared schema and the bucket's shared prefix without writing to either. The LongLink
            Platform stores user-owned and direct application IAM credentials together in a Kubernetes Secret before
            deploying the Application.
        </Text>
        <Grid columns={{ minWidth: 180, max: 3, repeat: 'fit' }} gap={4}>
            {runtimeResources.map(({ description, icon: ResourceIcon, name }) => (
                <Card key={name} variant="muted">
                    <Stack gap={3} align="center">
                        <ResourceIcon aria-hidden="true" className="text-accent" size={20} />
                        <Text weight="semibold">{name}</Text>
                        <Stack gap={1} align="center">
                            {description.map((line) => (
                                <Text key={line} type="supporting">
                                    {line}
                                </Text>
                            ))}
                        </Stack>
                    </Stack>
                </Card>
            ))}
        </Grid>
        <Heading id="access" level={2}>
            Access
        </Heading>
        <Text as="p">
            Applications do not have separate roles. Each member's Organization role applies to every Application in
            that Organization, including runtime requests, logs, creation, and deletion.
        </Text>
    </Stack>
);
