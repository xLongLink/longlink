import type { Expression } from 'acorn';
import type { ASTAttribute } from '../types';
import { parseExpressionAt, tokenizer } from 'acorn';

/** Compiles an XML attribute without evaluating it against runtime state. */
export function compileAttribute(value: string): ASTAttribute {
    const input = value.trim();

    // Store reference paths for deferred scope lookup and writable bindings.
    const reference = /^(\$)?[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.exec(input);
    if (reference && (reference[1] || input.includes('.'))) {
        const parts = input.slice(reference[1] ? 1 : 0).split('.') as [string, ...string[]];

        return reference[1] ? { kind: 'path', parts, isBinding: true } : { kind: 'path', parts };
    }

    // Compile mixed text and expressions into segments that render as text.
    if (input.includes('${')) {
        const segments: Array<{ kind: 'text'; value: string } | { kind: 'expression'; node: Expression }> = [];
        let cursor = 0;

        // Scan the string for interpolation starts.
        for (let index = 0; index < value.length; index += 1) {
            // Ignore characters that do not start an interpolation.
            if (value[index] !== '$' || value[index + 1] !== '{') continue;

            const segment = readInterpolationSegment(value, index);

            // Keep a single expression typed even when surrounded by whitespace.
            if (cursor === 0 && value.slice(0, index).trim() === '' && value.slice(segment.end + 1).trim() === '') {
                return { kind: 'expression', node: segment.node };
            }

            if (cursor < index) {
                segments.push({ kind: 'text', value: value.slice(cursor, index) });
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
function readInterpolationSegment(input: string, start: number) {
    // Normalize word operators without changing source offsets or literal contents.
    const source = input.slice(0, start + 2) + normalizeOperators(input.slice(start + 2));

    // Parse the interpolation body to find its boundary.
    try {
        const node = parseExpressionAt(source, start + 2, {
            ecmaVersion: 'latest',
        });
        let end = node.end;

        // Skip whitespace before the closing brace.
        while (end < input.length && /\s/.test(input[end])) {
            end += 1;
        }

        // Return only closed interpolation segments.
        if (input[end] === '}') return { end, node };
    } catch {}

    throw new Error('Unclosed XML expression interpolation');
}

/** Converts infix word operators to Acorn tokens within one interpolation. */
function normalizeOperators(input: string): string {
    const tokens = tokenizer(input, { ecmaVersion: 'latest' });
    let source = input;
    let depth = 0;
    let previous = '';

    // Tokenize only the current interpolation, leaving strings and comments intact.
    for (const token of tokens) {
        const label = token.type.label;
        const word = input.slice(token.start, token.end);

        // Stop at the interpolation boundary rather than scanning subsequent text.
        if (label === '}' && depth === 0) return source.slice(0, token.start + 1);
        if (label === '{' || label === '${') depth += 1;
        if (label === '}') depth -= 1;

        // Require word operators instead of legacy JavaScript conjunctions.
        if (label === '&&' || label === '||') {
            throw new Error('Use "and" and "or" instead of "&&" and "||" in XML expressions');
        }

        // Replace only infix identifiers, preserving names such as form.and and object keys.
        if (
            label === 'name' &&
            (word === 'and' || word === 'or') &&
            ['name', 'num', 'string', 'regexp', 'true', 'false', 'null', ')', ']', '}'].includes(previous)
        ) {
            const operator = word === 'and' ? '&& ' : '||';
            source = source.slice(0, token.start) + operator + source.slice(token.end);
            previous = operator.trim();
        } else {
            previous = label;
        }
    }

    return source;
}
