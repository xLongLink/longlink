import { Code } from '@astryxdesign/core/Code';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Collapsible } from '@astryxdesign/core/Collapsible';

const article = {
    description: 'Define API routes in a LongLink project.',
    toc: [
        { id: 'routes', label: 'Routes', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-09-24',
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
                    . Define routes directly on the <Code>LongLink</Code> application in <Code>main.py</Code>. Type a
                    route parameter as <Code>Context</Code> to receive the request-scoped database session, storage
                    filesystem, and signed-in user.
                </Text>
                <Collapsible
                    chevronPosition="start"
                    defaultIsOpen={false}
                    trigger={<Text weight="semibold">Why?</Text>}
                >
                    <Text as="p">TODO</Text>
                </Collapsible>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock
                    code={`from sqlmodel import select
from src.models.items import Item
from longlink import Context, LongLink


app = LongLink()


@app.get("/api/items", response_model=list[Item])
async def list_items(ctx: Context) -> list[Item]:
    """Return catalog items."""
    result = await ctx.database.exec(select(Item).order_by("id"))
    return result.all()`}
                    language="python"
                    title="main.py"
                />
            </Stack>
        </Article>
    );
}
