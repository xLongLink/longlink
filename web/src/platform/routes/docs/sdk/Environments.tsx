import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Collapsible } from '@astryxdesign/core/Collapsible';

const article = {
    description: 'Configure environments for local development and deployed LongLink services.',
    toc: [
        { id: 'environments', label: 'Environments', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-09-24',
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
                    LongLink uses{' '}
                    <Link
                        href="https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/"
                        hasUnderline
                        isExternalLink
                        type="inherit"
                    >
                        Pydantic Settings
                    </Link>{' '}
                    to define and manage project configuration.
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
