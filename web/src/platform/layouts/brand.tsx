import { Outlet } from 'react-router';
import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import Platform from '@/components/layouts/platform';

/** Renders the brand-only shell around routed or supplied Platform content. */
export default function Brand({ children = <Outlet /> }: { children?: ReactNode }) {
    return (
        <Platform
            action={
                <a
                    className="inline-flex items-center gap-2 font-sans text-sm leading-(--text-sm--line-height) whitespace-nowrap text-muted-foreground no-underline hover:text-[color-mix(in_srgb,var(--muted-foreground),var(--foreground)_15%)] hover:underline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid focus-visible:outline-offset-2"
                    href="/docs/"
                    target="_blank"
                    rel="noopener noreferrer"
                >
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
