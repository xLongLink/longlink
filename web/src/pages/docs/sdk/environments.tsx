import { A } from '@/components/ui/a';
import { CodeBlock } from '@/components/CodeBlock';
import { Heading } from '@/components/ui/heading';

export const metadata = {
    lastUpdated: '2026-06-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/environments.tsx',
};

export const content = (
    <div className="flex flex-col gap-4">
        <Heading id="environments" level="h1">
            Environments
        </Heading>
        <p className="leading-7">
            The <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">Environments</code>{' '}
            class defines and validates environment variables for an application.
        </p>
        <p className="leading-7">
            The class is a wrapper around{' '}
            <A href="https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/">Pydantic Settings</A>.
            LongLink loads and validates all environment variables at application startup.
        </p>
        <p className="leading-7">
            This ensures that configuration errors are detected early, before the application starts handling requests.
        </p>
        <Heading id="usage" level="h2">
            Usage
        </Heading>
        <p className="leading-7">
            Use required fields for values that must be present at startup, and optional fields for settings that can
            fall back to a default.
        </p>
        <CodeBlock language="python">{'from longlink import Environments, LongLink\nfrom pydantic import Field\n\n\nclass Env(Environments):\n    """Project-specific environment model."""\n\n    REQUIRED: str = Field(\n        description="Required example environment value",\n    )\n    OPTIONAL: str = Field(\n        default="optional",\n        description="Optional example environment value",\n    )\n\n\nenv = Env()\napp = LongLink(env=env)'}</CodeBlock>
        <Heading id="resources" level="h2">
            Resources
        </Heading>
        <ul className="ml-6 list-disc space-y-2">
            <li>
                <A href="https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/">Pydantic Settings</A>
            </li>
        </ul>
    </div>
);
