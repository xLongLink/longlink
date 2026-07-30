import { Code } from '@astryxdesign/core/Code';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import type { LucideIcon } from 'lucide-react';
import { CheckCheck, CheckCircle, Wrench } from 'lucide-react';
import { CodeBlock } from '@/components/CodeBlock';
import { EnvironmentTable } from '@/platform/docs/sdk/EnvironmentTable';

const environments: { backend: React.ReactNode; icon: LucideIcon; name: string }[] = [
    {
        name: 'Testing',
        icon: CheckCheck,
        backend: (
            <>
                <Code>memory</Code> backend for isolated in-memory test files.
            </>
        ),
    },
    {
        name: 'Development',
        icon: Wrench,
        backend: (
            <>
                <Code>file</Code> backend for inspectable local files.
            </>
        ),
    },
    {
        name: 'Production',
        icon: CheckCircle,
        backend: (
            <>
                <Code>s3</Code> backend using application and shared prefixes in one Organization bucket.
            </>
        ),
    },
];

export const metadata = {
    toc: [
        { id: 'usage', label: 'Usage' },
        { id: 'assets', label: 'Assets' },
    ],
    lastUpdated: '2026-07-20',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/storage.tsx',
};

export const content = (
    <Stack gap={5}>
        <Heading id="storage" level={1}>
            Storage
        </Heading>
        <Text as="p">
            The SDK exposes an application-scoped <Code>fs</Code> object backed by{' '}
            <Link href="https://filesystem-spec.readthedocs.io/en/latest/" isExternalLink type="inherit">
                fsspec
            </Link>
            . Application code uses the same filesystem interface in local development, tests, and production.
        </Text>
        <EnvironmentTable environments={environments} />
        <Text as="p">
            The LongLink Platform creates one bucket per Organization and gives each application direct IAM credentials.
            The credentials allow reads and writes in that application's prefix and read-only access to the shared
            prefix.
        </Text>
        <Heading id="usage" level={2}>
            Usage
        </Heading>
        <CodeBlock language="python">{`from longlink import Envs, create_fs

env = Envs()
fs = create_fs(env, env.STORAGE_BUCKET or "", env.STORAGE_PREFIX or "")

with fs.open("reports/example.txt", "wb") as f:
    f.write(b"hello")`}</CodeBlock>
        <Heading id="assets" level={2}>
            Assets
        </Heading>
        <Text as="p">
            Organization-level assets live in shared storage. The SDK exposes <Code>longlink.assets.logo()</Code> for
            the organization logo, using a bundled fallback in development and testing and the organization shared
            prefix in production. Pass the runtime environment and shared filesystem explicitly.
        </Text>
        <CodeBlock language="python">{`import longlink.assets as assets
from longlink import Envs, create_fs

env = Envs()
shared_fs = create_fs(env, env.STORAGE_BUCKET or "", env.STORAGE_SHARED_PREFIX or "")
logo = assets.logo(env, shared_fs)`}</CodeBlock>
    </Stack>
);
