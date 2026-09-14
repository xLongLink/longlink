import { z } from 'zod';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import { zStatus } from '@/lib/generated/platform-api-v1/zod.gen';
import { StatusBadge as PlatformStatusBadge } from '@/components/ui/StatusBadge';

const statusBadgePropsSchema = z.object({
    status: zStatus,
});

/** Renders non-healthy lifecycle statuses with their standard presentation. */
export function StatusBadge({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { status } = resolveXmlProps(props, ctx, statusBadgePropsSchema, ['status']);

    return <PlatformStatusBadge status={status} />;
}
