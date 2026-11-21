import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { Button } from '@/components/shadcn/button';
import { Stack } from '@/components/longlink/layout/stack';

export function SettingsLayout({ navigation, children }: { navigation: ReactNode; children: ReactNode }) {
    return (
        <div className="grid min-w-0 grid-cols-[260px_minmax(0,1fr)] items-start max-[47.999rem]:grid-cols-[minmax(0,1fr)] max-[47.999rem]:gap-6">
            <nav aria-label="Settings sections" className="flex min-w-0 flex-col gap-0.5 pe-4">
                {navigation}
            </nav>
            <Stack gap={3} className="min-w-0">
                {children}
            </Stack>
        </div>
    );
}

export function SettingsLink({ id, active, children }: { id: string; active: string; children: ReactNode }) {
    const location = useLocation();

    return (
        <Button
            nativeButton={false}
            render={<Link to={`${location.pathname}${location.search}#${id}`} />}
            variant={active === id ? 'secondary' : 'ghost'}
            size="sm"
            className="w-full justify-start"
            aria-current={active === id ? 'location' : undefined}
        >
            {children}
        </Button>
    );
}
