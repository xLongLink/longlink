import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { Blockquote } from '@astryxdesign/core/Blockquote';

const article = {
    description: 'LongLink vs Superblocks. This comparison page is being built.',
    toc: [{ id: 'longlink-vs-superblocks', label: 'LongLink vs Superblocks', level: 1 }],
    lastUpdated: '2026-10-06',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/compare/Superblocks.tsx',
    title: 'LongLink vs Superblocks | LongLink Compare',
};

/** Renders the placeholder for the Superblocks comparison. */
export default function Superblocks() {
    return (
        <Article page={article}>
            <Stack gap={4}>
                <Heading id="longlink-vs-superblocks" level={1} textWrap="balance">
                    LongLink vs Superblocks
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
