import { Link } from '@/components/astryx/Link';
import { Text } from '@/components/astryx/Text';
import { Stack } from '@/components/astryx/Stack';
import { Heading } from '@/components/astryx/Heading';
import { Blockquote } from '@/components/astryx/Blockquote';
import { PublicArticle } from '@/components/layouts/Article';

const article = {
    description: 'LongLink brand communication guidelines.',
    toc: [{ id: 'communication', label: 'Communication', level: 1 }],
    lastUpdated: '2026-10-06',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/branding/Communication.tsx',
    title: 'Communication | LongLink Branding',
};

/** Renders the communication page while its content is being built. */
export default function Communication() {
    // Reuse the article shell: 260px navigation, 720px prose, and 224px outline.
    return (
        <PublicArticle article={article}>
            <Stack gap={4}>
                <Heading id="communication" level={1}>
                    Communication
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
        </PublicArticle>
    );
}
