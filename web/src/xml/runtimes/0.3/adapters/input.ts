import type { InputStatus } from '@astryxdesign/core-0-3/Field';
import type { ASTProps, Scope } from '../types';
import { INPUT_STATUSES } from '../constants';
import { isXmlEnum, resolveXml } from '../core/props';

/** Builds a validated Astryx input status from XML scalar attributes. */
export function resolveInputStatus(props: ASTProps, ctx: Scope): InputStatus | undefined {
    const status = resolveXml(props, 'status', ctx);

    if (status == null) {
        return undefined;
    }

    if (!isXmlEnum(status, INPUT_STATUSES)) {
        throw new Error(`Unsupported input status '${String(status)}'`);
    }

    const message = resolveXml(props, 'statusMessage', ctx);
    return { type: status, ...(typeof message === 'string' ? { message } : {}) };
}
