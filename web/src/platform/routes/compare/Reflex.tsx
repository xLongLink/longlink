import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { Blockquote } from '@astryxdesign/core/Blockquote';

const article = {
    description: 'LongLink vs Reflex. This comparison page is being built.',
    toc: [{ id: 'longlink-vs-reflex', label: 'LongLink vs Reflex', level: 1 }],
    lastUpdated: '2026-10-06',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/compare/Reflex.tsx',
    title: 'LongLink vs Reflex | LongLink Compare',
};

/** Renders the placeholder for the Reflex comparison. */
export default function Reflex() {
    return (
        <Article page={article}>
            <Stack gap={4}>
                <Heading id="longlink-vs-reflex" level={1} textWrap="balance">
                    LongLink vs Reflex
                </Heading>
                <Blockquote className="border-s-(--color-text-orange) text-(--color-text-orange)">
                    <Stack gap={0}>
                        <Text type="inherit">Beta notice: This page is being built.</Text>
                        <Link color="inherit" href={article.editUrl} hasUnderline isExternalLink type="inherit">
                            Edit on GitHub
                        </Link>
                    </Stack>
                </Blockquote>
            </Stack>
        </Article>
    );
}
