import { Invalidate } from './adapters/Invalidate';
import type { XmlComponentRegistry } from '@/xml/types';
import { sdkXmlComponentRegistry } from '@/xml/core/registry';

/** Extends the SDK XML adapters with Platform-only components. */
export const platformXmlComponentRegistry: XmlComponentRegistry = {
    ...sdkXmlComponentRegistry,
    Invalidate,
};
