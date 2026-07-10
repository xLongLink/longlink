import { CodeBlock } from '@/components/CodeBlock';
import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';

export const metadata = {
    lastUpdated: '2026-07-09',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/storage.tsx',
};

export const content = (
    <Stack>
        <Heading id="storage" level="h1">
            Storage
        </Heading>
        <P>
            The SDK exposes an application-scoped <Code>fs</Code> object backed by{' '}
            <A href="https://filesystem-spec.readthedocs.io/en/latest/">fsspec</A>. Application code uses the same
            filesystem interface in local development, tests, and production.
        </P>
        <P>
            In production, the platform injects <Code>LONGLINK_STORAGE_ENDPOINT_URL</Code>,{' '}
            <Code>LONGLINK_STORAGE_USERNAME</Code>, <Code>LONGLINK_STORAGE_PASSWORD</Code>,{' '}
            <Code>LONGLINK_STORAGE_BUCKET</Code>, and <Code>LONGLINK_STORAGE_SHARED_BUCKET</Code> for the backend
            connection, app bucket, and organization shared bucket.
        </P>
        <P>
            Runtime storage credentials are scoped before deployment: apps can read and write their own bucket, and can
            read the organization shared bucket without writing to it.
        </P>
        <Heading id="usage" level="h2">
            Usage
        </Heading>
        <CodeBlock language="python">{`from longlink import fs

with fs.open("reports/example.txt", "wb") as f:
    f.write(b"hello")`}</CodeBlock>
    </Stack>
);
