import { CodeBlock } from '@/components/CodeBlock';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ul } from '@/components/ui/ul';

export const metadata = {
    lastUpdated: '2026-07-02',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/building.tsx',
};

export const content = (
    <Stack>
        <Heading id="building" level="h1">
            Building
        </Heading>
        <Ul>
            <Li>Applications can be built using Docker.</Li>
            <Li>
                <Code>longlink build</Code> builds the image from a temporary Docker context and leaves no build files
                in the app folder.
            </Li>
            <Li>Once containerized, applications can be pushed to any registry.</Li>
            <Li>
                <Code>longlink build --registry localhost:15000 --push --tag dev</Code> builds and pushes a reusable
                local development image tag.
            </Li>
            <Li>Applications can be connected to the control plane and deployed.</Li>
        </Ul>
        <Stack className="gap-2">
            <Heading id="application-metadata" level="h2">
                Application Metadata
            </Heading>
            <P>
                LongLink loads application metadata from <Code>pyproject.toml</Code>. Values in{' '}
                <Code>[tool.longlink]</Code> override standard <Code>[project]</Code> values where both are supported.
                The SDK exposes the loaded metadata and registered XML pages through <Code>/metadata.json</Code>, and{' '}
                <Code>longlink build</Code> writes the same app metadata into Docker labels for control-plane
                application creation.
            </P>
            <CodeBlock language="toml">{`[project]
name = "orders"
version = "1.2.0"
description = "Order workflow service"

[tool.longlink]
title = "Orders"
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
                    <Code>title</Code> and <Code>summary</Code> provide display text for app views and registration.
                </Li>
                <Li>
                    <Code>description</Code> falls back to <Code>[project].description</Code> when omitted from{' '}
                    <Code>[tool.longlink]</Code>.
                </Li>
                <Li>
                    <Code>contact</Code>, <Code>license_info</Code>, and <Code>terms_of_service</Code> are optional
                    metadata objects or URLs passed through to the runtime and image labels.
                </Li>
            </Ul>
        </Stack>
        <Stack className="gap-2">
            <Heading id="docker-labels" level="h2">
                Docker Labels
            </Heading>
            <P>The build command writes these labels into the image metadata when values are available:</P>
            <CodeBlock language="text">
                {
                    'longlink.name=<app-name>\nlonglink.sdk=<installed-longlink-version>\nlonglink.version=<app-pyproject-version>\nlonglink.description=<app-description>\nlonglink.environments=<json-environment-list>\nlonglink.title=<app-title>\nlonglink.summary=<app-summary>\nlonglink.terms_of_service=<terms-url>\nlonglink.contact=<contact-metadata>\nlonglink.license_info=<license-metadata>'
                }
            </CodeBlock>
            <Ul>
                <Li>
                    <Code>longlink.name</Code> is the application name.
                </Li>
                <Li>
                    <Code>longlink.sdk</Code> is the installed LongLink SDK version.
                </Li>
                <Li>
                    <Code>longlink.version</Code> is the application version from <Code>pyproject.toml</Code>.
                </Li>
                <Li>
                    <Code>longlink.description</Code> is the optional application description.
                </Li>
                <Li>
                    <Code>longlink.environments</Code> lists the app environment variables when <Code>src/envs.py</Code>{' '}
                    exists.
                </Li>
                <Li>
                    <Code>longlink.title</Code> is the optional application title.
                </Li>
                <Li>
                    <Code>longlink.summary</Code> is the optional short summary.
                </Li>
                <Li>
                    <Code>longlink.terms_of_service</Code> is the optional terms-of-service URL.
                </Li>
                <Li>
                    <Code>longlink.contact</Code> is the optional contact metadata.
                </Li>
                <Li>
                    <Code>longlink.license_info</Code> is the optional license metadata.
                </Li>
            </Ul>
        </Stack>
        <Tabs defaultValue="pip">
            <TabsList>
                <TabsTrigger value="pip">pip</TabsTrigger>
                <TabsTrigger value="uv">uv</TabsTrigger>
            </TabsList>
            <TabsContent value="pip">
                <CodeBlock language="bash">longlink build</CodeBlock>
            </TabsContent>
            <TabsContent value="uv">
                <CodeBlock language="bash">uv run longlink build</CodeBlock>
            </TabsContent>
        </Tabs>
    </Stack>
);
