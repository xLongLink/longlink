/** Returns true when the input is a `$`-prefixed reference path. */
export function isReference(expr: string): boolean {
    const input = expr.trim();

    return /^\$[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(input);
}

/** Returns true when the input is a simple text string. */
export function isText(attribute: ASTAttribute): attribute is Extract<ASTAttribute, { kind: 'text' }> {
    return attribute.kind === 'text';
}
import type { ASTAttribute } from '../types';
