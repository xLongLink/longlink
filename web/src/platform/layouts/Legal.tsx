import type { ReactNode } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Stack } from '@astryxdesign/core/Stack';
import { AppShell } from '@astryxdesign/core/AppShell';
import type { ArticleNavigationGroup } from '@/lib/articles';
import { Sidebar } from '@/components/Sidebar';

const LEGAL_GROUPS: ArticleNavigationGroup[] = [
    {
        title: 'Legal',
        items: [
            { title: 'Terms', path: '/terms' },
            { title: 'Impressum', path: '/impressum' },
            { title: 'Privacy', path: '/privacy' },
        ],
    },
];

/** Renders legal content with the fixed legal navigation. */
export function Legal({ children }: { children: ReactNode }) {
    return (
        <AppShell
            contentPadding={0}
            height="auto"
            mobileNav={{ breakpoint: 'lg' }}
            sideNav={<Sidebar groups={LEGAL_GROUPS} />}
            variant="wash"
        >
            <Card
                aria-hidden="true"
                className="pointer-events-none fixed z-0 end-0 bottom-0 start-0 top-12 overflow-clip lg:start-[260px] lg:top-0"
                padding={0}
                variant="transparent"
            >
                <Stack height="100%" padding={2}>
                    <Card className="border-0 overflow-clip" height="100%" width="100%" />
                </Stack>
            </Card>
            <Card
                aria-hidden="true"
                className="pointer-events-none fixed z-30 end-0 bottom-0 start-0 top-12 border-8 border-body bg-transparent lg:start-[260px] lg:top-0"
                padding={0}
                variant="transparent"
            />
            <Stack className="relative z-10" padding={2}>
                {children}
            </Stack>
        </AppShell>
    );
}
