import { Fragment } from 'react';
import { Wordmark } from '@/components/wordmark';
import { PublicArticle } from '@/components/layouts/article';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

const article = {
    description: 'LongLink logos, wordmarks, and illustrated brand assets.',
    toc: [
        { id: 'brand-assets', label: 'Brand assets', level: 1 },
        { id: 'logo', label: 'Logo', level: 2 },
        { id: 'wordmark', label: 'Wordmark', level: 2 },
        { id: 'images', label: 'Images', level: 2 }
    ],
    lastUpdated: '2026-10-07',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/branding/assets.tsx',
    title: 'Brand assets | LongLink Branding'
};

/** Presents the LongLink logo and downloadable brand assets. */
export default function Assets() {
    // Keep the article shell: 260px navigation, 720px prose, 224px outline, and 320px logo previews.
    return (
        <PublicArticle article={article}>
            <section className="flex flex-col gap-4">
                <h1
                    className="m-0 font-sans text-4xl leading-(--text-4xl--line-height) font-semibold text-foreground"
                    id="brand-assets"
                >
                    Brand assets
                </h1>
                <h2
                    className="m-0 font-sans text-3xl leading-(--text-3xl--line-height) font-semibold text-foreground"
                    id="logo"
                >
                    Logo
                </h2>
                <div className="flex flex-wrap gap-4">
                    {(['light', 'dark'] as const).map((mode) => (
                        <figure
                            className="m-0 flex w-full max-w-80 min-w-0 flex-col gap-2 [&_a]:text-inherit [&_a]:no-underline [&_a]:hover:underline [&_a:active]:bg-accent [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-ring [&_a:focus-visible]:outline-solid [&_a:focus-visible]:outline-offset-2"
                            key={mode}
                        >
                            <div
                                className="brand-assets-preview box-border w-full rounded-none bg-card text-foreground"
                                data-theme-scope="stone"
                                data-theme={mode}
                            >
                                <img
                                    className="block aspect-square w-full shrink-0 object-contain"
                                    src={`/longlink-logo-${mode}.png`}
                                    alt={`${mode === 'light' ? 'Dark' : 'White'} LongLink logo with a transparent background`}
                                />
                            </div>
                            <figcaption className="font-sans text-sm leading-(--text-sm--line-height) font-normal wrap-break-word text-muted-foreground opacity-90">
                                {mode === 'light' ? 'Light mode' : 'Dark mode'}
                                {(['svg', 'png', 'ico'] as const).map((format) => (
                                    <Fragment key={format}>
                                        {' · '}
                                        <a
                                            download={`longlink-logo-${mode}.${format}`}
                                            href={`/longlink-logo-${mode}.${format}`}
                                            title={`Download ${mode}-mode logo (${format.toUpperCase()})`}
                                        >
                                            {format.toUpperCase()}
                                        </a>
                                    </Fragment>
                                ))}
                            </figcaption>
                        </figure>
                    ))}
                </div>
            </section>
            <section className="flex flex-col gap-4">
                <h2
                    className="m-0 font-sans text-3xl leading-(--text-3xl--line-height) font-semibold text-foreground"
                    id="wordmark"
                >
                    Wordmark
                </h2>
                <div className="flex flex-wrap gap-4">
                    {(['light', 'dark'] as const).map((mode) => (
                        <figure
                            className="m-0 flex w-full max-w-80 min-w-0 flex-col gap-2 [&_a]:text-inherit [&_a]:no-underline [&_a]:hover:underline [&_a:active]:bg-accent [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-ring [&_a:focus-visible]:outline-solid [&_a:focus-visible]:outline-offset-2"
                            key={mode}
                        >
                            <div
                                className="brand-assets-preview box-border flex w-full flex-col items-center rounded-none bg-card p-8 text-foreground"
                                data-theme-scope="stone"
                                data-theme={mode}
                            >
                                <Wordmark size="heading" mode={mode} />
                            </div>
                            <figcaption className="font-sans text-sm leading-(--text-sm--line-height) font-normal wrap-break-word text-muted-foreground opacity-90">
                                {mode === 'light' ? 'Light mode' : 'Dark mode'} ·{' '}
                                <a
                                    download={`longlink-wordmark-${mode}.png`}
                                    href={`/images/longlink-wordmark-${mode}.png`}
                                    title={`Download ${mode}-mode LongLink wordmark (PNG)`}
                                >
                                    PNG
                                </a>
                            </figcaption>
                        </figure>
                    ))}
                </div>
            </section>
            <section className="flex flex-col gap-4">
                <h2
                    className="m-0 font-sans text-3xl leading-(--text-3xl--line-height) font-semibold text-foreground"
                    id="images"
                >
                    Images
                </h2>
                <CodeBlock
                    code={`<style>
  Minimalist monochrome technical sketch matching the reference. Thin white pencil/chalk lines, slightly rough and grainy, with imperfect hand-drawn contours, sparse construction lines, and very light hatching. Simple geometric forms, strong silhouettes, lots of negative space. Fully transparent background. No color, text, gradients, shadows, photorealism, or dense detail.
</style>`}
                    wrap
                    language="plaintext"
                >
                    <CodeBlockCopyButton />
                </CodeBlock>
            </section>
        </PublicArticle>
    );
}
