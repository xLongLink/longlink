import type { z } from 'zod';
import type { ComponentProps } from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import { zStatus } from '@/lib/generated/platform-api-v1/zod.gen';

type Status = z.output<typeof zStatus>;

const statusPresentation = {
    creating: { label: 'Creating', variant: 'info' },
    failed: { label: 'Failed', variant: 'error' },
} satisfies Record<Exclude<Status, 'running'>, { label: string; variant: ComponentProps<typeof Badge>['variant'] }>;

/** Renders an in-progress or failed lifecycle status, omitting healthy running state. */
export function StatusBadge({ status }: { status: Status }) {
    if (status === 'running') return null;

    return <Badge {...statusPresentation[status]} />;
}
