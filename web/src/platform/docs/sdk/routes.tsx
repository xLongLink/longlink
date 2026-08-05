import { Code } from '@astryxdesign/core/Code';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';

export const metadata = {
    toc: [
        { id: 'routes', label: 'Routes', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-08-05',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/routes.tsx',
};

export const content = (
    <Stack gap={5}>
        <Heading id="routes" level={1}>
            Routes
        </Heading>
        <Text as="p">
            Routes define how an Application receives HTTP requests and returns responses. This is where
            process-specific code logic takes place, including validation, workflows, and integrations.
        </Text>
        <Text as="p">
            LongLink Applications use a pure{' '}
            <Link href="https://fastapi.tiangolo.com/tutorial/" hasUnderline target="_blank" type="inherit">
                FastAPI
            </Link>{' '}
            implementation. Define routes with <Code>APIRouter</Code> and add them to the application as you would in
            any FastAPI project.
        </Text>
        <Heading id="usage" level={2}>
            Usage
        </Heading>
        <CodeBlock
            code={`from fastapi import APIRouter

router = APIRouter(prefix="/api")

@router.get("/sample")
async def sample() -> str:
    """This is a fastapi endpoint"""
    return "ok"`}
            language="python"
        />
    </Stack>
);
