import { CodeBlock } from '@/components/CodeBlock';
import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';

export const metadata = {
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/routes.tsx',
};

export const content = (
    <Stack>
        <Heading id="routes" level="h1">
            Routes
        </Heading>
        <P>
            A route is an address inside your application. Pages and other systems call routes when they need data, need
            to save a change, or need to run business logic.
        </P>
        <P>
            LongLink uses <A href="https://fastapi.tiangolo.com/tutorial/">FastAPI</A> for routes, but keeps the setup
            small. Define routes with <Code>Router</Code>, attach them to <Code>LongLink</Code>, and LongLink makes them
            available under <Code>/api</Code> so XML <Code>Query</Code> and <Code>Action</Code> elements can use them.
        </P>
        <Heading id="usage" level="h2">
            Usage
        </Heading>
        <CodeBlock language="python">{`from longlink import LongLink, Router

router = Router()

@router.get("/sample")
async def sample() -> str:
    """Return one sample object."""
    return "ok"

app = LongLink()
app.include_router(router)`}</CodeBlock>
    </Stack>
);
