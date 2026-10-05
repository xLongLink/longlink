import type { ReactNode } from 'react';
import { Document } from '@/components/Root';

export { Root as default } from '@/components/Root';

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
