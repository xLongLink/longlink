import { Code } from '@astryxdesign/core/Code';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';
import { CodeBlock } from '@/components/CodeBlock';

export const metadata = {
    toc: [{ id: 'application-metadata', label: 'Application Metadata' }],
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/building.tsx',
};

export const content = (
    <Stack gap={5}>
        <Heading id="building" level={1}>
            Building
        </Heading>
        <Text as="p">
            Building turns a local SDK application into a container image that the LongLink Platform can inspect,
            register, and deploy. The image carries LongLink metadata labels for application identity, SDK version,
            application version, display text, and declared environment requirements.
        </Text>
        <Text as="p">
            <Code>longlink build</Code> builds from a temporary Docker context and leaves the application folder
            untouched. Push the resulting image to a registry the LongLink Platform can reach before creating the
            application.
        </Text>
        <CodeBlock language="bash">longlink build [--tag dev] [--registry localhost:15000] [--push]</CodeBlock>
        <Text as="p">
            Use <Code>--tag</Code> to set the image version tag, <Code>--registry</Code> to prefix the image with a
            registry, and <Code>--push</Code> to push the image after the local Docker build completes.
        </Text>
        <Text as="p">
            Point <Code>longlink build</Code> at the environment class from <Code>pyproject.toml</Code>. The build
            command parses the class statically for image metadata, without importing application code or requiring real
            secret values.
        </Text>
        <CodeBlock>{`[tool.longlink]
environment = "src.envs:Env"`}</CodeBlock>
        <Stack gap={2}>
            <Heading id="application-metadata" level={2}>
                Application Metadata
            </Heading>
            <Text as="p">
                LongLink loads application metadata from <Code>pyproject.toml</Code>. Values in{' '}
                <Code>[tool.longlink]</Code> override standard <Code>[project]</Code> values where both are supported.
                The same section can also point <Code>longlink build</Code> at the user-defined environment class used
                for generated image metadata.
            </Text>
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
            <List listStyle="disc">
                <ListItem
                    label={
                        <Text>
                            <Code>name</Code> identifies the application. It falls back to <Code>[project].name</Code>.
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            <Code>version</Code> identifies the application version. It falls back to{' '}
                            <Code>[project].version</Code>.
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            <Code>title</Code> and <Code>summary</Code> provide display text for application views and
                            registration.
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            <Code>description</Code> falls back to <Code>[project].description</Code> when omitted from{' '}
                            <Code>[tool.longlink]</Code>.
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            <Code>contact</Code>, <Code>license_info</Code>, and <Code>terms_of_service</Code> are
                            optional metadata objects or URLs passed through to the runtime and image labels.
                        </Text>
                    }
                />
                <ListItem
                    label={
                        <Text>
                            <Code>environment</Code> is a <Code>module:Class</Code> import string for the user
                            environment class. It defaults to <Code>src.envs:Env</Code>.
                        </Text>
                    }
                />
            </List>
        </Stack>
    </Stack>
);
