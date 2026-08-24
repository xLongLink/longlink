import { Code } from '@astryxdesign/core/Code';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { CheckCheck, CheckCircle, Wrench } from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';

const metadata = {
    toc: [
        { id: 'storage', label: 'Storage', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'assets', label: 'Assets', level: 2 },
    ],
    lastUpdated: '2026-07-20',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/Storage.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
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
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHeaderCell>Environment</TableHeaderCell>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell>
                                <Stack gap={1}>
                                    <Stack direction="horizontal" gap={2} align="center">
                                        <CheckCheck aria-hidden="true" className="text-accent" size={16} />
                                        <Text weight="semibold">Testing</Text>
                                    </Stack>
                                    <Text type="supporting">
                                        <Code>memory</Code> backend for isolated in-memory test files.
                                    </Text>
                                </Stack>
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>
                                <Stack gap={1}>
                                    <Stack direction="horizontal" gap={2} align="center">
                                        <Wrench aria-hidden="true" className="text-accent" size={16} />
                                        <Text weight="semibold">Development</Text>
                                    </Stack>
                                    <Text type="supporting">
                                        <Code>file</Code> backend for inspectable local files.
                                    </Text>
                                </Stack>
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>
                                <Stack gap={1}>
                                    <Stack direction="horizontal" gap={2} align="center">
                                        <CheckCircle aria-hidden="true" className="text-accent" size={16} />
                                        <Text weight="semibold">Production</Text>
                                    </Stack>
                                    <Text type="supporting">
                                        <Code>s3</Code> backend using application and shared prefixes in one
                                        Organization bucket.
                                    </Text>
                                </Stack>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
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
        </Article>
    );
}
