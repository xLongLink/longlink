import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

const metadata = {
    seo: {
        title: 'Environments | LongLink Documentation',
        description: 'Configure environments for local development and deployed LongLink services.',
    },
    toc: [
        { id: 'environments', label: 'Environments', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-14',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/Environments.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
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
        </Article>
    );
}
