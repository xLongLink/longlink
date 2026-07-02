import { CodeBlock } from '@/components/CodeBlock';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Ul } from '@/components/ui/ul';

export const metadata = {
    lastUpdated: '2026-07-02',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/cli.tsx',
};

export const content = (
    <Stack>
        <Heading id="cli-reference" level="h1">
            CLI Reference
        </Heading>
        <P>
            The <Code>longlink</Code> command line interface manages the local SDK application workflow. Run commands
            from an application root unless the command creates a new project.
        </P>
        <Heading id="commands" level="h2">
            Commands
        </Heading>
        <Ul>
            <Li>
                <Code>longlink init --folder &lt;name&gt; [--ci github]</Code>: creates a new application scaffold in an
                empty target folder. Without <Code>--folder</Code>, the CLI prompts for the folder name.
            </Li>
            <Li>
                <Code>longlink dev</Code>: runs <Code>main:app</Code> locally with uvicorn reload on port{' '}
                <Code>1707</Code>. Interactive terminals support <Code>r</Code> restart, <Code>o</Code> open,{' '}
                <Code>c</Code> clear, and <Code>q</Code> quit.
            </Li>
            <Li>
                <Code>longlink test [pytest args...]</Code>: runs application tests with <Code>pytest</Code> and forwards
                additional arguments unchanged.
            </Li>
            <Li>
                <Code>longlink migrate</Code>: applies pending migrations, generates a migration when model changes are
                detected, and applies the generated migration.
            </Li>
            <Li>
                <Code>longlink build [--tag &lt;tag&gt;] [--registry &lt;prefix&gt;] [--push]</Code>: builds a Docker image
                from a temporary context, writes LongLink image labels, optionally pushes the tag, and prints image
                details.
            </Li>
            <Li>
                <Code>longlink docs [component]</Code>: prints bundled XML component documentation for one component or
                all components.
            </Li>
            <Li>
                <Code>longlink translations generate</Code>: scans XML page <Code>i18n</Code> keys and writes{' '}
                <Code>src/i18n/en.json</Code> while preserving existing translations and plural entries.
            </Li>
        </Ul>
        <Heading id="common-workflow" level="h2">
            Common Workflow
        </Heading>
        <CodeBlock language="bash">{`longlink init --folder demo-app
cd demo-app
longlink dev
longlink test
longlink migrate
longlink translations generate
longlink build --tag dev`}</CodeBlock>
        <Heading id="build-options" level="h2">
            Build Options
        </Heading>
        <Ul>
            <Li>
                <Code>--tag</Code> overrides the image version tag.
            </Li>
            <Li>
                <Code>--registry</Code> prefixes the generated image tag with a registry such as{' '}
                <Code>localhost:15000</Code>.
            </Li>
            <Li>
                <Code>--push</Code> pushes the built image tag after a successful local build.
            </Li>
        </Ul>
    </Stack>
);
