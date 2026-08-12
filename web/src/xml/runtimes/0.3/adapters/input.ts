import type { ASTProps, Scope } from '../types';
import { isXmlEnum, isXmlString, resolveXml } from '../core/props';

/** Builds a validated Astryx input status from XML scalar attributes. */
export function resolveInputStatus(props: ASTProps, ctx: Scope) {
    const status = resolveXml(props, 'status', ctx);

    if (status == null) return undefined;
    if (!isXmlEnum(status, ['warning', 'error', 'success'])) {
        throw new Error(`Unsupported input status '${String(status)}'`);
    }

    const message = resolveXml(props, 'statusMessage', ctx);

    return { type: status, ...(isXmlString(message) ? { message } : {}) };
}
