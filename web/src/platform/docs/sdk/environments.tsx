import { Code } from '@astryxdesign/core/Code';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';

export const metadata = {
    toc: [
        { id: 'environments', label: 'Environments', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-14',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/environments.tsx',
};

export const content = (
    <Stack gap={5}>
        <Heading id="environments" level={1}>
            Environments
        </Heading>
        <Text as="p">
            Environment variables let you configure an application without changing its source code. They are commonly
            used for values that differ between environments, such as database URLs, API keys, or feature settings.
        </Text>
        <Text as="p">
            LongLink makes this configuration easy to define and manage using{' '}
            <Link
                href="https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/"
                hasUnderline
                target="_blank"
                type="inherit"
            >
                Pydantic Settings
            </Link>
            . Your settings are validated, documented, and reused across <Code>development</Code>,{' '}
            <Code>production</Code>, and <Code>testing</Code>.
        </Text>
        <Heading id="usage" level={2}>
            Usage
        </Heading>
        <CodeBlock
            code={
                'from longlink import Environments\nfrom pydantic import Field\n\nclass Env(Environments):\n    """Project-specific environment model."""\n\n    REQUIRED: str = Field(description="Required value")\n    OPTIONAL: str = Field(default="optional", description="Optional value")'
            }
            language="python"
        />
    </Stack>
);
