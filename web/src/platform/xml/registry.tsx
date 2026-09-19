import { Invalidate } from './adapters/Invalidate';
import type { XmlComponentRegistry } from '@/xml/types';
import { SolutionUpdate } from './adapters/SolutionUpdate';
import { sdkXmlComponentRegistry } from '@/xml/core/registry';
import { CreateSolutionXml as CreateSolution } from '@/components/dialogs/CreateSolution';

/** Extends the SDK XML adapters with Platform-only Solution workflows. */
export const platformXmlComponentRegistry: XmlComponentRegistry = {
    ...sdkXmlComponentRegistry,
    CreateSolution,
    Invalidate,
    SolutionUpdate,
};
