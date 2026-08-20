import { parseExpressionAt } from 'acorn';
import type { ASTAttribute } from '../types';
import type { ExpressionNode } from './types';

type InterpolationSegment = {
    start: number;
    end: number;
    node: ExpressionNode;
};

/** Compiles an XML attribute without evaluating it against runtime state. */
export function compileAttribute(value: string): ASTAttribute {
    const input = value.trim();

    const standaloneExpression = readStandaloneExpression(input);

    // Keep standalone expressions typed when they are evaluated.
    if (standaloneExpression) return { kind: 'expression', node: standaloneExpression };

    // Store reference paths for deferred scope lookup and writable bindings.
    const reference = /^(\$)?[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.exec(input);
    if (reference && (reference[1] || input.includes('.'))) {
        const parts = input.slice(reference[1] ? 1 : 0).split('.') as [string, ...string[]];

        return {
            kind: 'path',
            parts,
            isBinding: Boolean(reference[1]),
        };
    }

    // Compile mixed text and expressions into segments that render as text.
    if (input.includes('${')) {
        const segments: Array<{ kind: 'text'; value: string } | { kind: 'expression'; node: ExpressionNode }> = [];
        let cursor = 0;

        // Scan the string for interpolation starts.
        for (let index = 0; index < value.length; index += 1) {
            // Ignore characters that do not start an interpolation.
            if (value[index] !== '$' || value[index + 1] !== '{') continue;

            const segment = readInterpolationSegment(value, index);
            if (cursor < segment.start) {
                segments.push({ kind: 'text', value: value.slice(cursor, segment.start) });
            }
            segments.push({ kind: 'expression', node: segment.node });
            cursor = segment.end + 1;
            index = segment.end;
        }

        if (cursor < value.length) {
            segments.push({ kind: 'text', value: value.slice(cursor) });
        }

        return { kind: 'interpolation', segments };
    }

    return { kind: 'text', value };
}

/** Finds the closing brace for one `${...}` segment using Acorn expression parsing. */
function readInterpolationSegment(input: string, start: number): InterpolationSegment {
    // Parse the interpolation body to find its boundary.
    try {
        const node = parseExpressionAt(input, start + 2, {
            ecmaVersion: 'latest',
        }) as unknown as ExpressionNode & { end: number };
        let end = node.end;

        // Skip whitespace before the closing brace.
        while (end < input.length && /\s/.test(input[end])) {
            end += 1;
        }

        // Return only closed interpolation segments.
        if (input[end] === '}') return { start, end, node };
    } catch {}

    throw new Error('Unclosed XML expression interpolation');
}

/** Returns one standalone expression when the entire value is wrapped in `${...}`. */
function readStandaloneExpression(input: string): ExpressionNode | null {
    // Only wrapped values can be standalone expressions.
    if (!input.startsWith('${')) return null;

    const segment = readInterpolationSegment(input, 0);

    return segment.end === input.length - 1 ? segment.node : null;
}
