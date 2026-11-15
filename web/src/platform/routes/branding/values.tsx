import { PublicArticle } from '@/components/layouts/article';
import { NativeLink as Link } from '@/components/custom/native-link';
import { NativeStack as Stack } from '@/components/custom/native-stack';

const article = {
    description: 'The values behind the LongLink brand.',
    toc: [{ id: 'values', label: 'Values', level: 1 }],
    lastUpdated: '2026-10-06',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/branding/values.tsx',
    title: 'Values | LongLink Branding'
};

/** Renders the values page while its content is being built. */
export default function Values() {
    // Reuse the article shell: 260px navigation, 720px prose, and 224px outline.
    return (
        <PublicArticle article={article}>
            <Stack gap={4}>
                <h1 className="font-semibold tracking-tight text-4xl" id="values">
                    Values
                </h1>
                <blockquote className="m-0 border-s-2 border-orange-600 ps-4 wrap-break-word text-orange-600 dark:border-orange-400 dark:text-orange-400">
                    <Stack gap={0}>
                        <span>Beta notice: This page is being built.</span>
                        <Link href={article.editUrl} isExternalLink className="underline text-inherit">
                            Edit on GitHub
                        </Link>
                    </Stack>
                </blockquote>
            </Stack>
        </PublicArticle>
    );
}
