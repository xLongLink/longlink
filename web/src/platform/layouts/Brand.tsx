import { Outlet } from 'react-router';
import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import Platform from '@/components/layouts/Platform';

/** Renders the brand-only shell around routed or supplied Platform content. */
export default function Brand({ children = <Outlet /> }: { children?: ReactNode }) {
    return (
        <Platform
            action={
                <Link href="/docs/" color="secondary" isStandalone target="_blank" rel="noopener noreferrer">
                    <Stack direction="horizontal" align="center" gap={2} className="whitespace-nowrap">
                        Documentation
                        <ExternalLink aria-hidden="true" size={16} className="shrink-0" />
                    </Stack>
                </Link>
            }
            tabs={[]}
        >
            <meta name="robots" content="noindex, nofollow" />
            {children}
        </Platform>
    );
}
