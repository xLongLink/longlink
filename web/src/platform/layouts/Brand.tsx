import { Outlet } from 'react-router';
import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import Platform from '@/components/layouts/Platform';

/** Renders the brand-only shell around routed or supplied Platform content. */
export default function Brand({ children = <Outlet /> }: { children?: ReactNode }) {
    return (
        <Platform
            action={
                <a className="brand-documentation" href="/docs/" target="_blank" rel="noopener noreferrer">
                    Documentation
                    <ExternalLink aria-hidden="true" size={16} className="shrink-0" />
                </a>
            }
            tabs={[]}
        >
            <meta name="robots" content="noindex, nofollow" />
            {children}
        </Platform>
    );
}
