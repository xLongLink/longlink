import type { ReactNode } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Stack } from '@astryxdesign/core/Stack';

/** Owns the application content surface and the View viewport-height contract. */
export default function Content({ children, toolbar }: { children: ReactNode; toolbar?: ReactNode }) {
    return (
        <Stack
            className={
                toolbar
                    ? 'relative [--platform-toolbar-height:calc(var(--size-element-md)+var(--spacing-3)*2)]'
                    : 'relative'
            }
            minHeight="calc(100dvh - var(--_app-shell-header-height, 0px))"
        >
            <Card
                aria-hidden="true"
                className="pointer-events-none absolute z-0 inset-0 overflow-clip bg-body p-2"
                padding={0}
                variant="transparent"
            >
                <Card className="border-0" height="100%" width="100%" />
            </Card>
            <Stack className="relative z-10" padding={2}>
                {toolbar}
                {children}
            </Stack>
        </Stack>
    );
}
