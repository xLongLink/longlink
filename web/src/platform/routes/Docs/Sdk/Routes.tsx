import { Code } from '@astryxdesign/core/Code';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { publicSeoMeta } from '@/lib/seo';
import { DocsArticle } from '@/platform/routes/Docs/Article';

export const metadata = {
    path: '/docs/sdk/routes',
    title: 'Routes',
    description: 'Add FastAPI routes to LongLink applications for APIs, actions, and process-specific behavior.',
    toc: [
        { id: 'routes', label: 'Routes', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-08-05',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/Docs/Sdk/Routes.tsx',
};

function Content() {
    return (
        <Stack gap={5}>
            <Heading id="routes" level={1}>
                Routes
            </Heading>
            <Text as="p">
                LongLink Applications use a pure{' '}
                <Link href="https://fastapi.tiangolo.com/tutorial/" hasUnderline isExternalLink type="inherit">
                    FastAPI
                </Link>{' '}
                implementation. Define routes with <Code>APIRouter</Code> and add them to the application as you would
                in any FastAPI project.
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
}

export const meta = () => publicSeoMeta(metadata);

export default function DocsArticleRoute() {
    return (
        <DocsArticle metadata={metadata}>
            <Content />
        </DocsArticle>
    );
}
