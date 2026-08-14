import type { ReactNode } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { AppShell } from '@astryxdesign/core/AppShell';
import type { ArticleNavigationGroup } from '@/lib/articles';
import { Sidebar } from '@/components/Sidebar';
import { ContentFrame } from '@/layout/ContentFrame';

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
            <ContentFrame className="end-0 bottom-0 start-0 top-12 lg:start-[260px] lg:top-0" />
            <Stack className="relative z-10" padding={2}>
                {children}
            </Stack>
        </AppShell>
    );
}
