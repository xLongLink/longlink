import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Center } from '@astryxdesign/core/Center';
import { Heading } from '@astryxdesign/core/Heading';

const applicationPaths = ['Use', 'Adapt', 'Create'];

export const metadata = {
    path: '/docs/api/applications',
    title: 'Applications',
    description: 'Learn how LongLink registers, deploys, routes, and manages business applications.',
    toc: [{ id: 'applications', label: 'Applications', level: 1 }],
    lastUpdated: '2026-08-05',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/api/applications.tsx',
};

export default function ApplicationsDocumentation() {
    return (
        <Stack gap={5}>
            <Heading id="applications" level={1}>
                Applications
            </Heading>
            <Text as="p">
                Applications are dedicated tools for running a specific part of an organization’s work. LongLink makes
                them easy to deploy, access, and operate, so teams can focus on the process the application is designed
                to support.
            </Text>
            <Text as="p">
                <Text color="primary" size="lg" type="label" weight="bold">
                    Use
                </Text>{' '}
                an existing application when its process already reflects the way your organization works. LongLink
                provides a consistent way to deploy and operate it, while giving authorized users access to the
                application and the resources it needs.
            </Text>
            <Text as="p">
                <Text color="primary" size="lg" type="label" weight="bold">
                    Adapt
                </Text>{' '}
                an existing application when the underlying process is familiar but the details differ. Teams can fork
                its Python code and adjust the workflows, rules, data model, pages, and integrations to match their own
                requirements.
            </Text>
            <Text as="p">
                <Text color="primary" size="lg" type="label" weight="bold">
                    Create
                </Text>{' '}
                a new application when a process needs a dedicated design from the start. Developers build the
                process-specific software as normal Python code, while LongLink provides the shared foundation for
                identity, permissions, deployment, data, storage, and operations.
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
        </Stack>
    );
}
