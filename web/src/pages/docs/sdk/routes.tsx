import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@/components/CodeBlock';

export const metadata = {
    lastUpdated: '2026-07-14',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/routes.tsx',
};

export const content = (
    <Stack gap={4}>
        <Heading id="routes" level={1}>
            Routes
        </Heading>
        <Text as="p">
            Routes are the entry points through which an application receives requests. A page can use a route to load
            information, save a change, or start a process.
        </Text>
        <Text as="p">
            LongLink Applications are designed so their core functionality is not tied to a single interface. The same
            application logic can be used by pages, external systems, automation tools, or AI agents. This makes
            applications easier to test, connect, and extend over time.
        </Text>
        <Text as="p">
            LongLink builds on{' '}
            <Link href="https://fastapi.tiangolo.com/tutorial/" isExternalLink type="inherit">
                FastAPI
            </Link>{' '}
            and keeps the routing setup simple, allowing developers to focus on the functionality of the application
            rather than the surrounding technical structure.
        </Text>
        <Heading id="usage" level={2}>
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
