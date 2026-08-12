import type { InputStatus } from '@astryxdesign/core-0-3/Field';
import { resolveXml } from '../core/props';
import type { ASTProps, Scope } from '../types';

/** Builds a validated Astryx input status from XML scalar attributes. */
export function resolveInputStatus(props: ASTProps, ctx: Scope): InputStatus | undefined {
    const status = resolveXml(props, 'status', ctx);

    if (status === 'warning') {
        const message = resolveXml(props, 'statusMessage', ctx);

        return { type: 'warning', ...(typeof message === 'string' ? { message } : {}) };
    }

    if (status === 'error') {
        const message = resolveXml(props, 'statusMessage', ctx);

        return { type: 'error', ...(typeof message === 'string' ? { message } : {}) };
    }

    if (status === 'success') {
        const message = resolveXml(props, 'statusMessage', ctx);

        return { type: 'success', ...(typeof message === 'string' ? { message } : {}) };
    }

    if (status != null) {
        throw new Error(`Unsupported input status '${String(status)}'`);
    }

    return undefined;
}
