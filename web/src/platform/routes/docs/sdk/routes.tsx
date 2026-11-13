import { DocumentationArticle } from '@/components/layouts/article';
import { NativeLink as Link } from '@/components/custom/native-link';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeHeading as Heading } from '@/components/custom/native-heading';
import {
    CodeBlock,
    CodeBlockCopyButton,
    CodeBlockHeader,
    CodeBlockTitle
} from '@/components/reui/code-block/code-block';

const article = {
    description: 'Define API routes in a LongLink project.',
    toc: [
        { id: 'routes', label: 'Routes', level: 1 },
        { id: 'example', label: 'Example', level: 2 },
        { id: 'permissions', label: 'Permissions', level: 2 },
        { id: 'exceptions', label: 'Exceptions', level: 2 }
    ],
    lastUpdated: '2026-10-29',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/routes.tsx',
    title: 'Routes | LongLink Documentation'
};

/** Documents standard FastAPI routes and Solution endpoint authorization. */
export default function DocsArticleRoute() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <Heading id="routes" level={1}>
                    Routes
                </Heading>
                <Text as="p">
                    Implement your application logic using standard{' '}
                    <Link href="https://fastapi.tiangolo.com/tutorial/" hasUnderline isExternalLink type="inherit">
                        FastAPI routes
                    </Link>
                    . LongLink provides the current user and common services such as the database and storage through{' '}
                    <InlineCode>Context</InlineCode>, so you can use them directly without additional configuration.
                </Text>
                <Stack as="aside" className="border-s border-accent ps-4" gap={0}>
                    <Text weight="semibold">Why?</Text>
                    <Text as="p">
                        FastAPI is widely used, documented, and well represented in AI training data, making it easier
                        for AI models to understand, navigate, and modify the code. The logic is built as a headless
                        API, allowing the same endpoints to be accessed by the interface, external applications, and AI
                        agents.
                    </Text>
                </Stack>
                <Heading id="example" level={2}>
                    Example
                </Heading>
                <CodeBlock
                    code={`from longlink import Context, LongLink


app = LongLink()


@app.get("/api/me", response_model=str)
async def current_user_name(ctx: Context) -> str:
    """Return the current user's name."""

    # Read the user supplied by LongLink for this request.
    return ctx.user.name`}
                    language="python"
                >
                    <CodeBlockHeader>
                        <CodeBlockTitle>main.py</CodeBlockTitle>
                        <CodeBlockCopyButton className="ml-auto" />
                    </CodeBlockHeader>
                </CodeBlock>
                <Heading id="permissions" level={2}>
                    Permissions
                </Heading>
                <Text as="p">
                    LongLink discovers permissions from registered HTTP methods and path templates at build time and
                    stores the catalog in the container image alongside environment requirements. No operation ID or
                    separate configuration file is needed. GET, HEAD, and OPTIONS default to the read and write roles;
                    POST, PUT, PATCH, and DELETE default to write. These are conventions: declare explicit roles for
                    sensitive reads, approvals, and other operations that need different access.
                </Text>
                <Text as="p">
                    Register all business routes when importing main:app, without requiring runtime configuration or
                    starting services. Route methods, paths, summaries, and roles must be deterministic and must not
                    depend on environment values or lifespan hooks. Builds compare catalogs from two isolated imports;
                    the runtime rejects requests whose permission catalog differs from the image metadata.
                </Text>
                <CodeBlock
                    language="python"
                    code={`from longlink import APIRouter

router = APIRouter(prefix="/api/invoices")

@router.post("/{id}/approve", roles=["admin"])
async def approve_invoice(id: int) -> dict[str, int]:
    return {"approved": id}`}
                >
                    <CodeBlockCopyButton />
                </CodeBlock>
                <Text as="p">
                    Import <InlineCode>APIRouter</InlineCode> from <InlineCode>longlink</InlineCode> to use the{' '}
                    <InlineCode>roles</InlineCode> keyword on route decorators. It also works directly on{' '}
                    <InlineCode>LongLink</InlineCode> applications. Explicit roles replace method defaults; pass role
                    names as a list, or an empty list for no role defaults. Role names are lowercase identifiers, and
                    Solution admin is not a Platform administrator or an automatic bypass. Endpoints excluded from
                    OpenAPI are still protected. Custom mounts are not supported for business operations.
                </Text>
                <Text as="p">
                    Build and deploy the image, then open Permissions in the Solution actions under organization
                    settings. Assign each member one of the SDK-defined roles, or select No access to set their role to
                    null and disable Solution access. Individual endpoint permissions are read-only in the Platform and
                    come exclusively from the role declarations in your Solution. Unassigned members have no Solution
                    access, and Write includes DELETE. Endpoint permissions are enforced for every deployed Solution.
                </Text>
                <Text as="p">
                    Deployments update role definitions without changing member role assignments. A changed method or
                    path is a new permission. Failed deployments and recovery retain the appropriate revision defaults.
                    MCP agents act as their authorizing user and use that user's current Solution permissions, including
                    subsequent permission changes.
                </Text>
                <Text as="p">
                    Permissions are enforced before endpoint dependencies and handlers, including calls made through
                    MCP. They control operations, not individual records or fields; keep business-level checks in the
                    endpoint when access depends on an invoice's owner or state. Local development keeps the seeded
                    development identity and does not require Platform assignments.
                </Text>
                <Heading id="exceptions" level={2}>
                    Exceptions
                </Heading>
                <Text as="p">
                    Invalid input returns <InlineCode>422</InlineCode>. Unhandled exceptions return a generic{' '}
                    <InlineCode>500</InlineCode> response without exposing the original message. Raise{' '}
                    <InlineCode>HTTPException</InlineCode> to return a status code and a public error message:
                </Text>
                <CodeBlock
                    code={`from fastapi import HTTPException


raise HTTPException(status_code=404, detail="Project not found")`}
                    language="python"
                >
                    <CodeBlockCopyButton />
                </CodeBlock>
            </Stack>
        </DocumentationArticle>
    );
}

import { InlineCode } from '@/components/shadcn/inline-code';
