import { CodeBlock } from '@/components/CodeBlock';
import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Ul } from '@/components/ui/ul';

export const metadata = {
    lastUpdated: '2026-06-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/environments.tsx',
};

export const content = (
    <Stack>
        <Heading id="environments" level="h1">
            Environments
        </Heading>
        <P>
            The <Code>Environments</Code> class defines and validates environment variables for an application.
        </P>
        <P>
            The class is a wrapper around{' '}
            <A href="https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/">Pydantic Settings</A>.
            LongLink loads and validates all environment variables at application startup.
        </P>
        <P>
            This ensures that configuration errors are detected early, before the application starts handling requests.
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
        <Heading id="resources" level="h2">
            Resources
        </Heading>
        <Ul>
            <Li>
                <A href="https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/">Pydantic Settings</A>
            </Li>
        </Ul>
    </Stack>
);
