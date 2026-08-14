import { Code } from '@astryxdesign/core/Code';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { CheckCheck, CheckCircle, Wrench } from 'lucide-react';
import { EnvironmentTable, type EnvironmentRow } from '@/platform/docs/sdk/EnvironmentTable';

const environments: EnvironmentRow[] = [
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
    path: '/docs/sdk/storage',
    title: 'Storage',
    description: 'Use LongLink storage abstractions across local filesystems, tests, and production object storage.',
    toc: [
        { id: 'storage', label: 'Storage', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'assets', label: 'Assets', level: 2 },
    ],
    lastUpdated: '2026-07-20',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/storage.tsx',
};

export default function StorageDocumentation() {
    return (
        <Stack gap={5}>
            <Heading id="storage" level={1}>
                Storage
            </Heading>
            <Text as="p">
                The SDK creates an application-scoped <Code>storage</Code> filesystem backed by{' '}
                <Link
                    href="https://filesystem-spec.readthedocs.io/en/latest/"
                    hasUnderline
                    isExternalLink
                    type="inherit"
                >
                    fsspec
                </Link>
                . Application code uses the same filesystem interface in local development, tests, and production.
            </Text>
            <EnvironmentTable environments={environments} />
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <CodeBlock
                code={`from longlink import storage

with storage.open("reports/example.txt", "wb") as f:
    f.write(b"hello")`}
                language="python"
            />
        </Stack>
    );
}
