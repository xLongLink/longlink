import { Stack } from '@/components/longlink/layout/stack';
import { NativeLink as Link } from '@/components/custom/native-link';
import { DocumentationArticle } from '@/platform/layouts/documentation-article';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

const article = {
    description: 'Store and manage files in a LongLink project.',
    toc: [
        { id: 'storage', label: 'Storage', level: 1 },
        { id: 'example', label: 'Example', level: 2 },
        { id: 'file-responses', label: 'Previews and downloads', level: 2 }
    ],
    lastUpdated: '2026-10-06',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/storage.tsx',
    title: 'Storage | LongLink Documentation'
};

export default function DocsArticleRoute() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <h1 className="font-semibold tracking-tight text-4xl" id="storage">
                    Storage
                </h1>
                <p>
                    Use <InlineCode>ctx.storage</InlineCode> to read and write files asynchronously through a normalized{' '}
                    <Link href="https://github.com/fsspec/filesystem_spec" className="underline" isExternalLink>
                        fsspec
                    </Link>{' '}
                    filesystem. Production uses{' '}
                    <Link href="https://github.com/fsspec/s3fs" className="underline" isExternalLink>
                        s3fs
                    </Link>{' '}
                    with native async S3 I/O through aiobotocore. Synchronous local and memory filesystems are adapted
                    internally, using worker threads rather than blocking async routes.
                </p>
                <Stack as="aside" className="border-s border-accent ps-4" gap={0}>
                    <span className="font-semibold">Why?</span>
                    <p>
                        The interface stays the same in every environment: in-memory storage for isolated tests, local
                        files during development for easy inspection, and an S3 storage space when deployed on the
                        LongLink platform.
                    </p>
                </Stack>
                <h2 className="font-semibold tracking-tight text-3xl" id="example">
                    Example
                </h2>
                <CodeBlock
                    code={`from longlink import Context

async def write_report(ctx: Context) -> None:
    await ctx.storage.write("reports/example.txt", b"hello")`}
                    language="python"
                >
                    <CodeBlockCopyButton />
                </CodeBlock>
                <p>
                    <InlineCode>write(path, bytes)</InlineCode> creates parent directories automatically. Use{' '}
                    <InlineCode>await ctx.storage.exists(path)</InlineCode> to check for a file and{' '}
                    <InlineCode>await ctx.storage.remove(path)</InlineCode> to delete it. Removing a missing file is
                    safe. <InlineCode>open(path)</InlineCode> returns a read-only binary file context.
                </p>
                <h2 className="font-semibold tracking-tight text-3xl" id="file-responses">
                    Previews and downloads
                </h2>
                <p>
                    Yield file chunks from a route with <InlineCode>response_class=StreamingResponse</InlineCode>. Set
                    the content type for previews; the frontend decides whether to preview or download the same URL. A
                    request-scoped dependency opens the file before streaming starts and closes it when the response
                    finishes. Missing stored files automatically return HTTP 404 without exposing storage paths.
                </p>
                <CodeBlock
                    code={`from collections.abc import AsyncIterator
from typing import Annotated
from fastapi import Depends
from fastapi.responses import StreamingResponse
from longlink import APIRouter, Context, storage

router = APIRouter()


class PDFStreamingResponse(StreamingResponse):
    media_type = "application/pdf"

async def report_file(ctx: Context) -> AsyncIterator[storage.File]:
    """Open the report before sending response headers."""

    # Check the caller's access before opening the report.
    async with ctx.storage.open("reports/latest.pdf") as stored_file:
        yield stored_file


@router.get("/reports/latest", response_class=PDFStreamingResponse)
async def report(
    stored_file: Annotated[storage.File, Depends(report_file)],
) -> AsyncIterator[bytes]:
    """Stream bounded chunks without blocking the event loop."""

    while chunk := await stored_file.read(1024 * 1024):
        yield chunk`}
                    language="python"
                >
                    <CodeBlockCopyButton />
                </CodeBlock>
                <p>
                    Use <InlineCode>FileViewer</InlineCode> for inline file previews, or <InlineCode>Link</InlineCode>{' '}
                    with a <InlineCode>download</InlineCode> filename to download directly. No backend download headers
                    or separate endpoint are required.
                </p>
                <CodeBlock
                    code={`<FileViewer src="/reports/latest" title="report.pdf" />
<Link href="/reports/latest" download="report.pdf">Download report</Link>`}
                    language="jsx"
                >
                    <CodeBlockCopyButton />
                </CodeBlock>
            </Stack>
        </DocumentationArticle>
    );
}

import { InlineCode } from '@/components/shadcn/inline-code';
