import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

const article = {
    description: 'Configure environments for local development and deployed LongLink services.',
    toc: [
        { id: 'environments', label: 'Environments', level: 1 },
        { id: 'example', label: 'Example', level: 2 },
    ],
    lastUpdated: '2026-09-26',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/Environments.tsx',
    title: 'Environments | LongLink Documentation',
};

export default function DocsArticleRoute() {
    return (
        <Article page={article}>
            <Stack gap={5}>
                <Heading id="environments" level={1}>
                    Environments
                </Heading>
                <Text as="p">
                    Use{' '}
                    <Link
                        href="https://github.com/pydantic/pydantic-settings"
                        hasUnderline
                        isExternalLink
                        type="inherit"
                    >
                        Pydantic Settings
                    </Link>{' '}
                    to define project configuration as typed, validated Python. Extend Environments with the values your
                    solution needs; they are loaded from .env.sample, .env, or process environment variables.
                </Text>
                <Stack as="aside" className="border-s border-accent ps-4" gap={0}>
                    <Text weight="semibold">Why?</Text>
                    <Text as="p">
                        A clear schema helps both developers and AI understand what the application expects, while early
                        validation catches missing or invalid values before the application starts running.
                    </Text>
                </Stack>
                <Heading id="example" level={2}>
                    Example
                </Heading>
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
                />
            </Stack>
        </Article>
    );
}
