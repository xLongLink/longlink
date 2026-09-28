import { Code } from '@astryxdesign/core/Code';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

const article = {
    description: 'Store and manage files in a LongLink project.',
    toc: [
        { id: 'storage', label: 'Storage', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'assets', label: 'Assets', level: 2 },
    ],
    lastUpdated: '2026-09-24',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/Storage.tsx',
    title: 'Storage | LongLink Documentation',
};

export default function DocsArticleRoute() {
    return (
        <Article page={article}>
            <Stack gap={5}>
                <Heading id="storage" level={1}>
                    Storage
                </Heading>
                <Text as="p">
                    Use <Code>ctx.storage</Code> as a standardized, universal interface to read and write files without
                    worrying about the underlying storage system. It is backed by{' '}
                    <Link href="https://github.com/fsspec/filesystem_spec" hasUnderline isExternalLink type="inherit">
                        fsspec
                    </Link>
                    .
                </Text>
                <Stack as="aside" className="border-s border-accent ps-4" gap={0}>
                    <Text weight="semibold">Why?</Text>
                    <Text as="p">
                        The interface stays the same in every environment: in-memory storage for isolated tests, local
                        files during development for easy inspection, and an S3 storage space when deployed on the
                        LongLink platform.
                    </Text>
                </Stack>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock
                    code={`from longlink import Context

async def write_report(ctx: Context) -> None:
    with ctx.storage.open("reports/example.txt", "wb") as f:
        f.write(b"hello")`}
                    language="python"
                />
            </Stack>
        </Article>
    );
}
