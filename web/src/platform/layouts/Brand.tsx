import { Outlet } from 'react-router';
import type { ReactNode } from 'react';
import { Link } from '@astryxdesign/core/Link';
import Platform from '@/platform/layouts/Platform';

/** Renders the brand-only shell around routed or supplied Platform content. */
export default function Brand({ children = <Outlet /> }: { children?: ReactNode }) {
    return (
        <Platform
            action={
                <Link href="/docs/" color="secondary" isStandalone target="_blank">
                    Documentation
                </Link>
            }
            tabs={[]}
        >
            {children}
        </Platform>
    );
}
