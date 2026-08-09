import { Card } from '@astryxdesign/core/Card';
import { Center } from '@astryxdesign/core/Center';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';

const applicationPaths = ['Use', 'Adapt', 'Create'];

export const metadata = {
    toc: [
        { id: 'applications', label: 'Applications', level: 1 },
        { id: 'use', label: 'Use', level: 2 },
        { id: 'adapt', label: 'Adapt', level: 2 },
        { id: 'create', label: 'Create', level: 2 },
    ],
    lastUpdated: '2026-08-05',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/api/applications.tsx',
};

export const content = (
    <Stack gap={5}>
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
        <Grid columns={{ minWidth: 190, max: 3, repeat: 'fit' }} gap={4}>
            {applicationPaths.map((path) => (
                <Stack key={path} gap={2}>
                    <Card height={190} padding={0} variant="muted">
                        <Center height="100%">
                            <Heading className="mt-0" level={2}>
                                {path}
                            </Heading>
                        </Center>
                    </Card>
                    <Text color="secondary" type="supporting">
                        {path}
                    </Text>
                </Stack>
            ))}
        </Grid>
        <Heading id="use" level={2}>
            Use
        </Heading>
        <Heading id="adapt" level={2}>
            Adapt
        </Heading>
        <Heading id="create" level={2}>
            Create
        </Heading>
    </Stack>
);
