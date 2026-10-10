import type { ReactNode } from 'react';
import { Root } from '@/components/Root';
import { Document } from '@/components/layouts/Document';
// Handwritten fonts belong only to native Platform pages, not the embedded SDK application.
import '@fontsource/kalam';
import '@fontsource/kalam/700.css';

/** Provides the shared runtime and native Platform fonts. */
export default function PlatformRoot() {
    return <Root />;
}

/** Adds website analytics only to the Platform document. */
export function Layout({ children }: { children: ReactNode }) {
    return (
        <Document
            head={
                <script
                    defer
                    src="https://cloud.umami.is/script.js"
                    data-website-id="eff115b8-10d7-4507-abf5-6b3de55eab3f"
                />
            }
        >
            {children}
        </Document>
    );
}
