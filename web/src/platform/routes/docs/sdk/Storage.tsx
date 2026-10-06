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
        { id: 'example', label: 'Example', level: 2 },
        { id: 'file-responses', label: 'Previews and downloads', level: 2 },
    ],
    lastUpdated: '2026-10-06',
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
                <Heading id="example" level={2}>
                    Example
                </Heading>
                <CodeBlock
                    code={`from longlink import Context

async def write_report(ctx: Context) -> None:
    with ctx.storage.open("reports/example.txt", "wb") as f:
        f.write(b"hello")`}
                    language="python"
                />
                <Heading id="file-responses" level={2}>
                    Previews and downloads
                </Heading>
                <Text as="p">
                    Use <Code>ctx.file()</Code> to preview a file in the browser, or <Code>ctx.download()</Code> to
                    download it.
                </Text>
                <CodeBlock
                    code={`from fastapi import APIRouter, Response
from longlink import Context

router = APIRouter()


@router.get("/reports/preview")
async def preview_report(ctx: Context) -> Response:
    """Serve a stored report for browser preview."""

    # Return an inline response with a friendly display name.
    return ctx.file("reports/latest.pdf", filename="report.pdf")


@router.get("/reports/download")
async def download_report(ctx: Context) -> Response:
    """Serve a stored report as a download."""

    # Use the storage path's basename as the download filename.
    return ctx.download("reports/latest.pdf")`}
                    language="python"
                />
            </Stack>
        </Article>
    );
}
