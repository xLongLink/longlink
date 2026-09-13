import { z } from 'zod';
import type { Props } from '../types';
import { Badge } from '@astryxdesign/core/Badge';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';

const statusBadgePropsSchema = z.object({
    status: z.enum(['creating', 'failed', 'running']),
});

/** Renders non-healthy lifecycle statuses with their standard presentation. */
export function StatusBadge({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { status } = resolveXmlProps(props, ctx, statusBadgePropsSchema, ['status']);

    if (status === 'running') return null;

    return (
        <Badge
            label={status === 'creating' ? 'Creating' : 'Failed'}
            variant={status === 'creating' ? 'info' : 'error'}
        />
    );
}
