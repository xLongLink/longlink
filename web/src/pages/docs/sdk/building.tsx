import { P } from '@/components/ui/p';
import { Li } from '@/components/ui/li';
import { Ul } from '@/components/ui/ul';
import { Code } from '@/components/ui/code';
import { Stack } from '@/components/ui/stack';
import { Heading } from '@/components/ui/heading';
import { CodeBlock } from '@/components/CodeBlock';

export const metadata = {
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/building.tsx',
};

export const content = (
    <Stack>
        <Heading id="building" level="h1">
            Building
        </Heading>
        <P>
            Building turns a local SDK application into a container image that the LongLink Platform can inspect,
            register, and deploy. The image carries LongLink metadata labels for application identity, SDK version,
            application version, display text, and declared environment requirements.
        </P>
        <P>
            <Code>longlink build</Code> builds from a temporary Docker context and leaves the application folder
            untouched. Push the resulting image to a registry the LongLink Platform can reach before creating the
            application.
        </P>
        <CodeBlock language="bash">longlink build [--tag dev] [--registry localhost:15000] [--push]</CodeBlock>
        <P>
            Use <Code>--tag</Code> to set the image version tag, <Code>--registry</Code> to prefix the image with a
            registry, and <Code>--push</Code> to push the image after the local Docker build completes.
        </P>
        <P>
            Point <Code>longlink build</Code> at the environment class from <Code>pyproject.toml</Code>. The build
            command parses the class statically for image metadata, without importing application code or requiring real
            secret values.
        </P>
        <CodeBlock>{`[tool.longlink]
environment = "src.envs:Env"`}</CodeBlock>
        <Stack className="gap-2">
            <Heading id="application-metadata" level="h2">
                Application Metadata
            </Heading>
            <P>
                LongLink loads application metadata from <Code>pyproject.toml</Code>. Values in{' '}
                <Code>[tool.longlink]</Code> override standard <Code>[project]</Code> values where both are supported.
                The same section can also point <Code>longlink build</Code> at the user-defined environment class used
                for generated image metadata.
            </P>
            <CodeBlock>{`[project]
name = "orders"
version = "1.2.0"
description = "Order workflow service"

[tool.longlink]
title = "Orders"
environment = "src.envs:Env"
summary = "Review, assign, and complete orders"
description = "Operational order management for warehouse teams"
terms_of_service = "https://example.com/terms"

[tool.longlink.contact]
name = "Operations Team"
email = "ops@example.com"

[tool.longlink.license_info]
name = "Private"`}</CodeBlock>
            <Ul>
                <Li>
                    <Code>name</Code> identifies the application. It falls back to <Code>[project].name</Code>.
                </Li>
                <Li>
                    <Code>version</Code> identifies the application version. It falls back to{' '}
                    <Code>[project].version</Code>.
                </Li>
                <Li>
                    <Code>title</Code> and <Code>summary</Code> provide display text for application views and
                    registration.
                </Li>
                <Li>
                    <Code>description</Code> falls back to <Code>[project].description</Code> when omitted from{' '}
                    <Code>[tool.longlink]</Code>.
                </Li>
                <Li>
                    <Code>contact</Code>, <Code>license_info</Code>, and <Code>terms_of_service</Code> are optional
                    metadata objects or URLs passed through to the runtime and image labels.
                </Li>
                <Li>
                    <Code>environment</Code> is a <Code>module:Class</Code> import string for the user environment
                    class. It defaults to <Code>src.envs:Env</Code>.
                </Li>
            </Ul>
        </Stack>
    </Stack>
);
