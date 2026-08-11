import type { ASTAttribute } from '../types';

/** Returns true when the input is a simple text string. */
export function isText(attribute: ASTAttribute): attribute is Extract<ASTAttribute, { kind: 'text' }> {
    return attribute.kind === 'text';
}
