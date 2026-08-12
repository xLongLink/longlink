import type { ReactNode } from 'react';
import { Links, Meta, Scripts, ScrollRestoration } from 'react-router';
import interFont from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url';

/** Renders the common LongLink HTML document shell. */
export function Document({ children, headContent }: { children: ReactNode; headContent?: ReactNode }) {
    return (
        <html lang="en" data-astryx-theme="stone" data-theme="dark">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <Meta />
                <Links />
                <link rel="icon" href="/favicon.ico" />
                <link rel="preload" href={interFont} as="font" type="font/woff2" crossOrigin="anonymous" />
                {headContent}
            </head>
            <body>
                {children}
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}
