import { SolutionLogs } from './adapters/SolutionLogs';
import type { XmlComponentRegistry } from '@/xml/types';
import { CreateSolution } from './adapters/CreateSolution';
import { SolutionUpdate } from './adapters/SolutionUpdate';
import { sdkXmlComponentRegistry } from '@/xml/core/registry';

/** Extends the SDK XML adapters with Platform-only Solution workflows. */
export const platformXmlComponentRegistry: XmlComponentRegistry = {
    ...sdkXmlComponentRegistry,
    CreateSolution,
    SolutionLogs,
    SolutionUpdate,
};
