import { z } from 'zod';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import CreateSolutionDialog from '@/components/dialogs/CreateSolution';

const createSolutionPropsSchema = z.object({ organizationId: z.string().uuid() });

/** Renders the established Solution creation workflow from an XML View. */
export function CreateSolution({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { organizationId } = resolveXmlProps(props, ctx, createSolutionPropsSchema);

    return <CreateSolutionDialog organizationId={organizationId} />;
}
