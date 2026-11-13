import { Outlet } from 'react-router';
import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import Platform from '@/components/layouts/Platform';

/** Renders the brand-only shell around routed or supplied Platform content. */
export default function Brand({ children = <Outlet /> }: { children?: ReactNode }) {
    return (
        <Platform
            action={
                <a
                    className="inline-flex items-center gap-2 font-sans text-[length:var(--text-body-size)] leading-(--text-body-leading) whitespace-nowrap text-muted-foreground no-underline hover:text-[color-mix(in_srgb,var(--muted-foreground),var(--color-tint-hover)_15%)] hover:underline focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-(--focus-outline-color) focus-visible:outline-solid focus-visible:outline-offset-(--focus-outline-offset)"
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
