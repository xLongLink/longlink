import { CodeBlock } from '@/components/CodeBlock';
import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';

export const metadata = {
    lastUpdated: '2026-07-09',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/environments.tsx',
};

export const content = (
    <Stack>
        <Heading id="environments" level="h1">
            Environments
        </Heading>
        <P>
            Application configuration is declared with an <Code>Environments</Code> model. The SDK loads this model at
            startup, validates values before request handling begins, and exposes declared requirements to the build
            metadata used by the control plane.
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
            Use required fields for values that must be present at startup, and optional fields for settings that can
            fall back to a default.
        </P>
        <CodeBlock language="python">
            {
                'from longlink import Environments, LongLink\nfrom pydantic import Field\n\n\nclass Env(Environments):\n    """Project-specific environment model."""\n\n    REQUIRED: str = Field(\n        description="Required example environment value",\n    )\n    OPTIONAL: str = Field(\n        default="optional",\n        description="Optional example environment value",\n    )\n\n\nenv = Env()\napp = LongLink(env=env)'
            }
        </CodeBlock>
    </Stack>
);
