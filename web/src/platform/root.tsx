import type { ReactNode } from 'react';
import { Root } from '@/components/Root';
import { useLocation, useNavigate } from 'react-router';
import { Document } from '@/components/layouts/Document';
import { MenuNavigationContext } from '@/components/ui/Menu';

/** Supplies native Platform Menus with router-owned fragment navigation. */
export default function PlatformRoot() {
    const location = useLocation();
    const navigate = useNavigate();

    // Keep this host adapter out of the SDK application and its sandbox-local Menu provider.
    return (
        <MenuNavigationContext
            value={{
                hash: location.hash,
                select: (id) => {
                    void navigate({
                        pathname: location.pathname,
                        search: location.search,
                        hash: `#${id}`,
                    });
                },
            }}
        >
            <Root />
        </MenuNavigationContext>
    );
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
