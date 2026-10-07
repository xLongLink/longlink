import { Fragment } from 'react';
import { stoneTheme } from '@/theme';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Wordmark } from '@/components/Wordmark';
import { Stack } from '@astryxdesign/core/Stack';
import { Theme } from '@astryxdesign/core/theme';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Seo, articleRouteLabels } from '@/components/Seo';
import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { PathBreadcrumb } from '@/components/breadcrumb/Path';
import { BreadcrumbItem } from '@astryxdesign/core/Breadcrumbs';
import { ArticleFooter, ArticleOutline } from '@/platform/components/Article';

const article = {
    description: 'LongLink logos, wordmarks, and illustrated brand assets.',
    toc: [
        { id: 'brand-assets', label: 'Brand assets', level: 1 },
        { id: 'logo', label: 'Logo', level: 2 },
        { id: 'wordmark', label: 'Wordmark', level: 2 },
        { id: 'images', label: 'Images', level: 2 },
    ],
    lastUpdated: '2026-10-07',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/branding/Assets.tsx',
    title: 'Brand assets | LongLink Branding',
};

/** Presents the LongLink logo and downloadable brand assets. */
export default function Assets() {
    // Keep the article shell: 260px navigation, 720px prose, 224px outline, and 320px logo previews.
    return (
        <>
            <Seo description={article.description} hasBreadcrumbs title={article.title} />
            <Article
                header={
                    <PathBreadcrumb
                        className="min-w-0 overflow-hidden"
                        labels={articleRouteLabels}
                        root={<BreadcrumbItem href="/">Home</BreadcrumbItem>}
                    />
                }
                headerAction={<Button href="/login/" label="Get Started" size="sm" variant="primary" />}
                footer={<ArticleFooter lastUpdated={article.lastUpdated} editUrl={article.editUrl} />}
                sidebar={article.toc.length ? <ArticleOutline items={article.toc} /> : undefined}
            >
                <Stack gap={4}>
                    <Heading id="brand-assets" level={1}>
                        Brand assets
                    </Heading>
                    <Heading id="logo" level={2}>
                        Logo
                    </Heading>
                    <Stack direction="horizontal" gap={4} wrap="wrap">
                        {(['light', 'dark'] as const).map((mode) => (
                            <Stack as="figure" gap={2} key={mode} maxWidth={320} width="100%">
                                <Theme mode={mode} theme={stoneTheme}>
                                    <Stack className="bg-surface" width="100%">
                                        <AspectRatio fit="contain" ratio={1}>
                                            <img
                                                src={`/longlink-logo-${mode}.png`}
                                                alt={`${mode === 'light' ? 'Dark' : 'White'} LongLink logo with a transparent background`}
                                            />
                                        </AspectRatio>
                                    </Stack>
                                </Theme>
                                <Text as="p" type="supporting">
                                    {mode === 'light' ? 'Light mode' : 'Dark mode'}
                                    {(['svg', 'png', 'ico'] as const).map((format) => (
                                        <Fragment key={format}>
                                            {' · '}
                                            <Link
                                                color="inherit"
                                                download={`longlink-logo-${mode}.${format}`}
                                                href={`/longlink-logo-${mode}.${format}`}
                                                tooltip={`Download ${mode}-mode logo (${format.toUpperCase()})`}
                                                type="inherit"
                                            >
                                                {format.toUpperCase()}
                                            </Link>
                                        </Fragment>
                                    ))}
                                </Text>
                            </Stack>
                        ))}
                    </Stack>
                </Stack>
                <Stack gap={4}>
                    <Heading id="wordmark" level={2}>
                        Wordmark
                    </Heading>
                    <Stack direction="horizontal" gap={4} wrap="wrap">
                        {(['light', 'dark'] as const).map((mode) => (
                            <Stack as="figure" gap={2} key={mode} maxWidth={320} width="100%">
                                <Theme mode={mode} theme={stoneTheme}>
                                    <Stack className="bg-surface" hAlign="center" padding={8} width="100%">
                                        <Wordmark size="heading" />
                                    </Stack>
                                </Theme>
                                <Text as="p" type="supporting">
                                    {mode === 'light' ? 'Light mode' : 'Dark mode'} ·{' '}
                                    <Link
                                        color="inherit"
                                        download={`longlink-wordmark-${mode}.png`}
                                        href={`/images/longlink-wordmark-${mode}.png`}
                                        tooltip={`Download ${mode}-mode LongLink wordmark (PNG)`}
                                        type="inherit"
                                    >
                                        PNG
                                    </Link>
                                </Text>
                            </Stack>
                        ))}
                    </Stack>
                </Stack>
                <Stack gap={4}>
                    <Heading id="images" level={2}>
                        Images
                    </Heading>
                    <CodeBlock
                        code={`<style>
  Minimalist monochrome technical sketch matching the reference. Thin white pencil/chalk lines, slightly rough and grainy, with imperfect hand-drawn contours, sparse construction lines, and very light hatching. Simple geometric forms, strong silhouettes, lots of negative space. Fully transparent background. No color, text, gradients, shadows, photorealism, or dense detail.
</style>`}
                        isWrapped
                        language="plaintext"
                        width="100%"
                    />
                </Stack>
            </Article>
        </>
    );
}
