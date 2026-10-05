import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { List, ListItem } from '@astryxdesign/core/List';

const article = {
    title: 'Documentation | LongLink',
    description:
        'Learn how to build Python Solutions with the LongLink SDK and use the Platform to manage organizations, access, infrastructure, and deployment.',
    lastUpdated: '2026-10-05',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/Index.tsx',
};

/** Introduces the documentation and links to the main guides and references. */
export default function DocsIndex() {
    return (
        <Article page={article}>
            <Stack gap={6}>
                <Heading level={1}>LongLink Documentation</Heading>
                <Text as="p">
                    LongLink separates business process logic from the infrastructure needed to run it. A Solution
                    expresses a business process as code. The Platform manages organizations, access, infrastructure,
                    and deployment. These guides explain how to build Solutions in Python and operate them with
                    LongLink.
                </Text>
                <List header={<Heading level={2}>Start here</Heading>} hasDividers>
                    <ListItem
                        href="/docs/introduction/"
                        label="Why LongLink"
                        description={
                            <Text as="p">Understand the shared foundation behind process-specific applications.</Text>
                        }
                    />
                    <ListItem
                        href="/docs/sdk/"
                        label="Build a Solution"
                        description={
                            <Text as="p">Create a Python and FastAPI service with the LongLink Solution SDK.</Text>
                        }
                    />
                    <ListItem
                        href="/docs/api/"
                        label="Platform documentation"
                        description={
                            <Text as="p">Manage organizations, permissions, and the deployment of your Solutions.</Text>
                        }
                    />
                </List>
                <Stack as="section" gap={3}>
                    <Heading level={2}>Develop and deploy</Heading>
                    <Text as="p">
                        Configure environments, define routes, store data, and build a View: a JSX interface rendered by
                        the isolated shared Web runtime. Use the testing and building guides to prepare your Solution
                        for deployment.
                    </Text>
                    <List aria-label="Solution development guides" hasDividers>
                        <ListItem href="/docs/sdk/environments/" label="Environments" />
                        <ListItem href="/docs/sdk/routes/" label="Routes" />
                        <ListItem href="/docs/sdk/storage/" label="Storage" />
                        <ListItem href="/docs/sdk/database/" label="Database" />
                        <ListItem href="/docs/sdk/views/" label="Views and component reference" />
                        <ListItem href="/docs/sdk/testing/" label="Testing" />
                        <ListItem href="/docs/sdk/building/" label="Building and deployment" />
                    </List>
                </Stack>
            </Stack>
        </Article>
    );
}
