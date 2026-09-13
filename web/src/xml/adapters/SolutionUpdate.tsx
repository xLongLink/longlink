import { z } from 'zod';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import SolutionUpdateControl from '@/components/SolutionUpdate';
import { zOrganizationSolutionSummary } from '@/lib/generated/platform-api-v1/zod.gen';

const solutionUpdatePropsSchema = z.object({ organizationId: z.string().uuid(), solution: z.unknown() });

/** Renders the established Solution revision workflow from an XML table row. */
export function SolutionUpdate({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { organizationId, solution } = resolveXmlProps(props, ctx, solutionUpdatePropsSchema, ['solution']);

    return (
        <SolutionUpdateControl
            organizationId={organizationId}
            solution={zOrganizationSolutionSummary.parse(solution)}
        />
    );
}
