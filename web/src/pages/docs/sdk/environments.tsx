import { A } from '@/components/ui/a';
import { P } from '@/components/ui/p';
import { Code } from '@/components/ui/code';
import { Stack } from '@/components/ui/stack';
import { Heading } from '@/components/ui/heading';
import { CodeBlock } from '@/components/CodeBlock';

export const metadata = {
    lastUpdated: '2026-07-14',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/environments.tsx',
};

export const content = (
    <Stack>
        <Heading id="environments" level="h1">
            Environments
        </Heading>
        <P>
            Environment variables are constants provided to an application when it runs. They keep configuration outside
            the source code, allowing the application to run in different environments without changing its
            implementation.
        </P>
        <P>
            LongLink provides a simple, consistent way to define and manage this configuration, built on top of{' '}
            <A href="https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/">Pydantic Settings</A>.
            This gives applications validated and well-documented settings across local development and production. You
            define the configuration once, and LongLink reuses it wherever the application runs.
        </P>
        <Heading id="usage" level="h2">
            Usage
        </Heading>
        <CodeBlock language="python">
            {
                'from longlink import Environments\nfrom pydantic import Field\n\nclass Env(Environments):\n    """Project-specific environment model."""\n\n    REQUIRED: str = Field(description="Required value")\n    OPTIONAL: str = Field(default="optional", description="Optional value")'
            }
        </CodeBlock>
        <Heading id="settings" level="h2">
            Settings
        </Heading>
        <P>
            Point the <Code>tool.longlink</Code> section in <Code>pyproject.toml</Code> to the environment class so
            LongLink knows which settings your application uses when it is built and deployed.
        </P>
        <CodeBlock language="text">{'[tool.longlink]\nenvironment = "src.envs:Env"'}</CodeBlock>
    </Stack>
);
