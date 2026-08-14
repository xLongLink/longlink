import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { publicSeoMeta } from '@/lib/seo';
import { DocsArticle } from '@/platform/routes/Docs/Article';

export const metadata = {
    path: '/docs/sdk/environments',
    title: 'Environments',
    description: 'Configure LongLink applications for local development, testing, and production environments.',
    toc: [
        { id: 'environments', label: 'Environments', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-14',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/Docs/Sdk/Environments.tsx',
};

function Content() {
    return (
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
                to define and manage Application configuration.
            </Text>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <CodeBlock
                code={
                    'from longlink import Environments\nfrom pydantic import Field\n\nclass Env(Environments):\n    """Project-specific environment model."""\n\n    REQUIRED: str = Field(description="Required value")\n    OPTIONAL: str = Field(default="optional", description="Optional value")'
                }
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
