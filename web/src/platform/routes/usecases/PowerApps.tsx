import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { Blockquote } from '@astryxdesign/core/Blockquote';

const article = {
    description: 'LongLink vs Microsoft Power Apps. This comparison page is being built.',
    toc: [{ id: 'longlink-vs-microsoft-power-apps', label: 'LongLink vs Microsoft Power Apps', level: 1 }],
    lastUpdated: '2026-10-06',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/usecases/PowerApps.tsx',
    title: 'LongLink vs Microsoft Power Apps | LongLink Use Cases',
};

/** Renders the placeholder for the Microsoft Power Apps comparison. */
export default function PowerApps() {
    return (
        <Article page={article}>
            <Stack gap={4}>
                <Heading id="longlink-vs-microsoft-power-apps" level={1} textWrap="balance">
                    LongLink vs Microsoft Power Apps
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
