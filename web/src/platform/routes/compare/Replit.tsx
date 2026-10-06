import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { Blockquote } from '@astryxdesign/core/Blockquote';

const article = {
    description: 'LongLink vs Replit. This comparison page is being built.',
    toc: [{ id: 'longlink-vs-replit', label: 'LongLink vs Replit', level: 1 }],
    lastUpdated: '2026-10-06',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/compare/Replit.tsx',
    title: 'LongLink vs Replit | LongLink Compare',
};

/** Renders the placeholder for the Replit comparison. */
export default function Replit() {
    return (
        <Article page={article}>
            <Stack gap={4}>
                <Heading id="longlink-vs-replit" level={1} textWrap="balance">
                    LongLink vs Replit
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
