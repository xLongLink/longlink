import { z } from 'zod';
import type { Props } from '@/xml/types';
import { useXmlRuntime } from '@/xml/core/context';
import { resolveXmlProps } from '@/xml/core/props';
import CreateSolutionDialog from '@/components/dialogs/CreateSolution';

const createSolutionPropsSchema = z.object({ organizationId: z.string().uuid() });

/** Renders the established Solution creation workflow from an XML View. */
export function CreateSolution({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { organizationId } = resolveXmlProps(props, ctx, createSolutionPropsSchema);

    return <CreateSolutionDialog organizationId={organizationId} />;
}
