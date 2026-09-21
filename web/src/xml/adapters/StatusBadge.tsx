import { z } from 'zod';
import type { Props } from '../types';
import type { ComponentProps } from 'react';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import { Badge } from '@astryxdesign/core/Badge';
import { zStatus } from '@/lib/generated/platform-api-v1/zod.gen';

type Status = z.output<typeof zStatus>;

const statusPresentation = {
    creating: { label: 'Creating', variant: 'info' },
    failed: { label: 'Failed', variant: 'error' },
} satisfies Record<Exclude<Status, 'running'>, { label: string; variant: ComponentProps<typeof Badge>['variant'] }>;

const statusBadgePropsSchema = z.object({
    status: zStatus,
});

/** Renders non-healthy lifecycle statuses with their standard presentation. */
export function StatusBadge({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { status } = resolveXmlProps(props, ctx, statusBadgePropsSchema, ['status']);

    if (status === 'running') return null;

    return <Badge {...statusPresentation[status]} />;
}
