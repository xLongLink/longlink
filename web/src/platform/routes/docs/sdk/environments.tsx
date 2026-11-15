import { NativeLink as Link } from '@/components/custom/native-link';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { DocumentationArticle } from '@/components/layouts/documentation';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

const article = {
    description: 'Configure environments for local development and deployed LongLink services.',
    toc: [
        { id: 'environments', label: 'Environments', level: 1 },
        { id: 'example', label: 'Example', level: 2 }
    ],
    lastUpdated: '2026-09-26',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/environments.tsx',
    title: 'Environments | LongLink Documentation'
};

export default function DocsArticleRoute() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <h1 className="font-semibold tracking-tight text-4xl" id="environments">
                    Environments
                </h1>
                <p>
                    Use{' '}
                    <Link href="https://github.com/pydantic/pydantic-settings" className="underline" isExternalLink>
                        Pydantic Settings
                    </Link>{' '}
                    to define project configuration as typed, validated Python. Extend Environments with the values your
                    solution needs; they are loaded from .env.sample, .env, or process environment variables.
                </p>
                <Stack as="aside" className="border-s border-accent ps-4" gap={0}>
                    <span className="font-semibold">Why?</span>
                    <p>
                        A clear schema helps both developers and AI understand what the application expects, while early
                        validation catches missing or invalid values before the application starts running.
                    </p>
                </Stack>
                <h2 className="font-semibold tracking-tight text-3xl" id="example">
                    Example
                </h2>
                <CodeBlock
                    code={`from pydantic import Field
from longlink import Environments


class Env(Environments):
    """Project-specific environment model."""

    REQUIRED: str = Field(description="Required value")
    OPTIONAL: str = Field(default="optional", description="Optional value")


env = Env()
print(env.REQUIRED)`}
                    language="python"
                >
                    <CodeBlockCopyButton />
                </CodeBlock>
            </Stack>
        </DocumentationArticle>
    );
}
