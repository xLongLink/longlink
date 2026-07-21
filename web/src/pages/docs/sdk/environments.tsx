import { Code } from '@astryxdesign/core/Code';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@/components/CodeBlock';

export const metadata = {
    toc: [
        { id: 'usage', label: 'Usage' },
        { id: 'settings', label: 'Settings' },
    ],
    lastUpdated: '2026-07-14',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/environments.tsx',
};

export const content = (
    <Stack gap={5}>
        <Heading id="environments" level={1}>
            Environments
        </Heading>
        <Text as="p">
            Environment variables are constants provided to an application when it runs. They keep configuration outside
            the source code, allowing the application to run in different environments without changing its
            implementation.
        </Text>
        <Text as="p">
            LongLink provides a simple, consistent way to define and manage this configuration, built on top of{' '}
            <Link
                href="https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/"
                isExternalLink
                type="inherit"
            >
                Pydantic Settings
            </Link>
            . This gives applications validated and well-documented settings across local development and production.
            You define the configuration once, and LongLink reuses it wherever the application runs.
        </Text>
        <Heading id="usage" level={2}>
            Usage
        </Heading>
        <CodeBlock language="python">
            {
                'from longlink import Environments\nfrom pydantic import Field\n\nclass Env(Environments):\n    """Project-specific environment model."""\n\n    REQUIRED: str = Field(description="Required value")\n    OPTIONAL: str = Field(default="optional", description="Optional value")'
            }
        </CodeBlock>
        <Heading id="settings" level={2}>
            Settings
        </Heading>
        <Text as="p">
            Point the <Code>tool.longlink</Code> section in <Code>pyproject.toml</Code> to the environment class so
            LongLink knows which settings your application uses when it is built and deployed.
        </Text>
        <CodeBlock language="text">{'[tool.longlink]\nenvironment = "src.envs:Env"'}</CodeBlock>
    </Stack>
);
