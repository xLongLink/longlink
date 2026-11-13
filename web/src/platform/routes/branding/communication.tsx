import { PublicArticle } from '@/components/layouts/article';
import { NativeLink as Link } from '@/components/custom/native-link';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeHeading as Heading } from '@/components/custom/native-heading';

const article = {
    description: 'LongLink brand communication guidelines.',
    toc: [{ id: 'communication', label: 'Communication', level: 1 }],
    lastUpdated: '2026-10-06',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/branding/communication.tsx',
    title: 'Communication | LongLink Branding'
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
                <blockquote className="m-0 border-s-2 border-s-(--color-text-orange) ps-4 wrap-break-word text-(--color-text-orange)">
                    <Stack gap={0}>
                        <Text type="inherit">Beta notice: This page is being built.</Text>
                        <Link color="inherit" href={article.editUrl} hasUnderline isExternalLink type="inherit">
                            Edit on GitHub
                        </Link>
                    </Stack>
                </blockquote>
            </Stack>
        </PublicArticle>
    );
}
