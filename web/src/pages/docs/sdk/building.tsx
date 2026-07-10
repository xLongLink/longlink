import { CodeBlock } from '@/components/CodeBlock';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ul } from '@/components/ui/ul';

export const metadata = {
    lastUpdated: '2026-07-09',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/building.tsx',
};

export const content = (
    <Stack>
        <Heading id="building" level="h1">
            Building
        </Heading>
        <P>
            Building turns a local SDK application into a container image that the control plane can inspect, register,
            and deploy. The image carries LongLink metadata labels for application identity, SDK version, app version,
            display text, and declared environment requirements.
        </P>
        <P>
            <Code>longlink build</Code> builds from a temporary Docker context and leaves the application folder
            untouched. Push the resulting image to a registry the control plane can reach before creating the
            application.
        </P>
        <Heading id="build-command" level="h2">
            Build Command
        </Heading>
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
        <P>For a reusable local development tag, build and push to a local registry:</P>
        <CodeBlock language="bash">longlink build --registry localhost:15000 --push --tag dev</CodeBlock>
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
    </Stack>
);
