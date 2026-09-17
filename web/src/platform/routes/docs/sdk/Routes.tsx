import { Code } from '@astryxdesign/core/Code';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

const article = {
    description: 'Define API routes in a LongLink project.',
    toc: [
        { id: 'routes', label: 'Routes', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'request-context', label: 'Request context', level: 2 },
    ],
    lastUpdated: '2026-09-17',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/Routes.tsx',
    title: 'Routes | LongLink Documentation',
};

export default function DocsArticleRoute() {
    return (
        <Article page={article}>
            <Stack gap={5}>
                <Heading id="routes" level={1}>
                    Routes
                </Heading>
                <Text as="p">
                    LongLink projects use standard{' '}
                    <Link href="https://fastapi.tiangolo.com/tutorial/" hasUnderline isExternalLink type="inherit">
                        FastAPI
                    </Link>
                    . Define routes directly on the <Code>LongLink</Code> application in <Code>main.py</Code>.
                </Text>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock
                    code={`from longlink import LongLink

app = LongLink()

@app.get("/api/sample")
async def sample() -> str:
    """This is a fastapi endpoint"""
    return "ok"`}
                    language="python"
                    title="main.py"
                />
                <Heading id="request-context" level={2}>
                    Request context
                </Heading>
                <Text as="p">
                    Type a route parameter as <Code>Context</Code> to receive the request-scoped database session,
                    storage filesystem, and signed-in user. No <Code>Depends</Code> is needed.
                </Text>
                <CodeBlock
                    code={`from collections.abc import Sequence
from longlink import Context, LongLink
from sqlmodel import select
from src.models.items import Item

app = LongLink()

@app.get("/api/items", response_model=list[Item])
async def list_items(ctx: Context) -> Sequence[Item]:
    """Return catalog items."""
    result = await ctx.database.exec(select(Item).order_by("id"))
    return result.all()`}
                    language="python"
                />
            </Stack>
        </Article>
    );
}
