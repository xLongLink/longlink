import './assets.css';
import { Fragment } from 'react';
import { Wordmark } from '@/components/Wordmark';
import { PublicArticle } from '@/components/layouts/Article';
import { NativeCodeBlock as CodeBlock } from '@/components/ui/NativeCodeBlock';

const article = {
    description: 'LongLink logos, wordmarks, and illustrated brand assets.',
    toc: [
        { id: 'brand-assets', label: 'Brand assets', level: 1 },
        { id: 'logo', label: 'Logo', level: 2 },
        { id: 'wordmark', label: 'Wordmark', level: 2 },
        { id: 'images', label: 'Images', level: 2 }
    ],
    lastUpdated: '2026-10-07',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/branding/Assets.tsx',
    title: 'Brand assets | LongLink Branding'
};

/** Presents the LongLink logo and downloadable brand assets. */
export default function Assets() {
    // Keep the article shell: 260px navigation, 720px prose, 224px outline, and 320px logo previews.
    return (
        <PublicArticle article={article}>
            <section className="brand-assets-section">
                <h1 id="brand-assets">Brand assets</h1>
                <h2 id="logo">Logo</h2>
                <div className="brand-assets-previews">
                    {(['light', 'dark'] as const).map((mode) => (
                        <figure className="brand-assets-figure" key={mode}>
                            <div className="brand-assets-preview" data-theme-scope="stone" data-theme={mode}>
                                <img
                                    className="brand-assets-logo"
                                    src={`/longlink-logo-${mode}.png`}
                                    alt={`${mode === 'light' ? 'Dark' : 'White'} LongLink logo with a transparent background`}
                                />
                            </div>
                            <figcaption>
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
            <section className="brand-assets-section">
                <h2 id="wordmark">Wordmark</h2>
                <div className="brand-assets-previews">
                    {(['light', 'dark'] as const).map((mode) => (
                        <figure className="brand-assets-figure" key={mode}>
                            <div
                                className="brand-assets-preview brand-assets-wordmark"
                                data-theme-scope="stone"
                                data-theme={mode}
                            >
                                <Wordmark size="heading" mode={mode} />
                            </div>
                            <figcaption>
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
            <section className="brand-assets-section">
                <h2 id="images">Images</h2>
                <CodeBlock
                    code={`<style>
  Minimalist monochrome technical sketch matching the reference. Thin white pencil/chalk lines, slightly rough and grainy, with imperfect hand-drawn contours, sparse construction lines, and very light hatching. Simple geometric forms, strong silhouettes, lots of negative space. Fully transparent background. No color, text, gradients, shadows, photorealism, or dense detail.
</style>`}
                    isWrapped
                    language="plaintext"
                    width="100%"
                />
            </section>
        </PublicArticle>
    );
}
