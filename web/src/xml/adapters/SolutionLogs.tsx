import { z } from 'zod';
import { useState } from 'react';
import type { Props } from '../types';
import Logs from '@/components/dialogs/Logs';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import { Button } from '@astryxdesign/core/Button';

const solutionLogsPropsSchema = z.object({ solutionId: z.string().uuid() });

/** Renders the established Solution log viewer from an XML table row. */
export function SolutionLogs({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { solutionId } = resolveXmlProps(props, ctx, solutionLogsPropsSchema);
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button label="Logs" size="sm" variant="ghost" clickAction={() => setIsOpen(true)} />
            {isOpen && <Logs kind="solution" resourceId={solutionId} onOpenChange={setIsOpen} />}
        </>
    );
}
