import { A } from '@/components/ui/a';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Heading } from '@/components/ui/heading';
import { CodeBlock } from '@/components/CodeBlock';

export const metadata = {
    lastUpdated: '2026-07-14',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/routes.tsx',
};

export const content = (
    <Stack>
        <Heading id="routes" level="h1">
            Routes
        </Heading>
        <P>
            Routes are the entry points through which an application receives requests. A page can use a route to load
            information, save a change, or start a process.
        </P>
        <P>
            LongLink Applications are designed so their core functionality is not tied to a single interface. The same
            application logic can be used by pages, external systems, automation tools, or AI agents. This makes
            applications easier to test, connect, and extend over time.
        </P>
        <P>
            LongLink builds on <A href="https://fastapi.tiangolo.com/tutorial/">FastAPI</A> and keeps the routing setup
            simple, allowing developers to focus on the functionality of the application rather than the surrounding
            technical structure.
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
