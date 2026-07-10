import { CodeBlock } from '@/components/CodeBlock';
import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';

export const metadata = {
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/environments.tsx',
};

export const content = (
    <Stack>
        <Heading id="environments" level="h1">
            Environments
        </Heading>
        <P>
            Application configuration is declared with an <Code>Environments</Code> model so required deployment values
            stay explicit in application code.
        </P>
        <P>
            The class wraps{' '}
            <A href="https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/">Pydantic Settings</A>, so
            required values, defaults, descriptions, and type validation stay close to application code.
        </P>
        <Heading id="usage" level="h2">
            Usage
        </Heading>
        <P>
            Use required fields for values that must be provided by the deployment, and optional fields for settings
            that can fall back to a default. Create <Code>Env()</Code> in your own application code when you need to read
            values; the <Code>LongLink</Code> app object does not need the user environment instance.
        </P>
        <CodeBlock language="python">
            {
                'from longlink import Environments\nfrom pydantic import Field\n\nclass Env(Environments):\n    """Project-specific environment model."""\n\n    REQUIRED: str = Field(description="Required value")\n    OPTIONAL: str = Field(default="optional", description="Optional value")'
            }
        </CodeBlock>
    </Stack>
);
