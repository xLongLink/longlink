import { siteName } from '@/site';
import type { ReactNode } from 'react';

/** Renders page content with its document metadata. */
export function Page({ title, description, children }: { title: string; description: string; children: ReactNode }) {
    return (
        <>
            <title>{title}</title>
            <meta name="description" content={description} />
            <meta name="robots" content="index, follow" />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content={siteName} />
            <meta name="twitter:card" content="summary" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            {children}
        </>
    );
}
