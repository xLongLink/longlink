import type { InputStatus } from '@astryxdesign/core-0-3/Field';
import { INPUT_STATUSES } from '../constants';
import { resolveXml } from '../core/props';
import type { ASTProps, Scope } from '../types';

/** Builds a validated Astryx input status from XML scalar attributes. */
export function resolveInputStatus(props: ASTProps, ctx: Scope): InputStatus | undefined {
    const status = resolveXml(props, 'status', ctx);

    if (status === INPUT_STATUSES[0]) {
        const message = resolveXml(props, 'statusMessage', ctx);

        return { type: 'warning', ...(typeof message === 'string' ? { message } : {}) };
    }

    if (status === INPUT_STATUSES[1]) {
        const message = resolveXml(props, 'statusMessage', ctx);

        return { type: 'error', ...(typeof message === 'string' ? { message } : {}) };
    }

    if (status === INPUT_STATUSES[2]) {
        const message = resolveXml(props, 'statusMessage', ctx);

        return { type: 'success', ...(typeof message === 'string' ? { message } : {}) };
    }

    if (status != null) {
        throw new Error(`Unsupported input status '${String(status)}'`);
    }

    return undefined;
}
