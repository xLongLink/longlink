import { parse, parseExpressionAt } from 'acorn';
import type { ExecutionContext } from '../types';

import { createScopeProxy, hasSafeProperty, isSafePropertyName, readSafeProperty, resolvePath } from './resolve';
import type { ExpressionNode } from './types';
import { isReference } from './utils';

const expressionNodeCache = new Map<string, ExpressionNode>();

type SafeExpressionCall = (...args: unknown[]) => unknown;

type InterpolationSegment = {
    start: number;
    end: number;
    expression: string;
};

const SAFE_IDENTIFIER_CALLS: Record<string, SafeExpressionCall> = {
    Boolean: (value) => Boolean(value),
    Number: (value) => Number(value),
    String: (value) => String(value),
};

const SAFE_ARRAY_CALLS: Record<string, SafeExpressionCall> = {
    isArray: (value) => Array.isArray(value),
};

const SAFE_MATH_CALLS: Record<string, SafeExpressionCall> = {
    abs: (value) => Math.abs(Number(value)),
    ceil: (value) => Math.ceil(Number(value)),
    floor: (value) => Math.floor(Number(value)),
    max: (...values) => Math.max(...values.map((value) => Number(value))),
    min: (...values) => Math.min(...values.map((value) => Number(value))),
    round: (value) => Math.round(Number(value)),
    trunc: (value) => Math.trunc(Number(value)),
};

/** Parses and caches one JavaScript expression supported by the XML evaluator. */
function parseExpression(expression: string): ExpressionNode {
    const cachedNode = expressionNodeCache.get(expression);

    if (cachedNode) {
        return cachedNode;
    }

    const ast = parse(`(${expression})`, {
        ecmaVersion: 'latest',
        sourceType: 'script',
    }) as unknown as { body: Array<{ expression: ExpressionNode }> };
    const node = ast.body[0].expression;

    expressionNodeCache.set(expression, node);
    return node;
}

/** Reads one safe function call from an allowlist. */
function readSafeFunction(calls: Record<string, SafeExpressionCall>, key: string): SafeExpressionCall | undefined {
    const value = readSafeProperty(calls, key);

    return typeof value === 'function' ? (value as SafeExpressionCall) : undefined;
}

/** Resolves a whitelisted global helper call without exposing runtime objects. */
function resolveSafeCall(callee: ExpressionNode): SafeExpressionCall | undefined {
    if (callee.type === 'ChainExpression') {
        return resolveSafeCall(callee.expression);
    }

    if (callee.type === 'Identifier') {
        return readSafeFunction(SAFE_IDENTIFIER_CALLS, callee.name);
    }

    if (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.object.type === 'Identifier' &&
        callee.property.type === 'Identifier'
    ) {
        if (callee.object.name === 'Array') {
            return readSafeFunction(SAFE_ARRAY_CALLS, callee.property.name);
        }

        if (callee.object.name === 'Math') {
            return readSafeFunction(SAFE_MATH_CALLS, callee.property.name);
        }
    }

    return undefined;
}

/** Finds the closing brace for one `${...}` segment using Acorn expression parsing. */
function readInterpolationSegment(input: string, start: number): InterpolationSegment {
    try {
        const node = parseExpressionAt(input, start + 2, {
            ecmaVersion: 'latest',
            sourceType: 'script',
        }) as unknown as ExpressionNode & { end: number };
        let end = node.end;

        while (end < input.length && /\s/.test(input[end])) {
            end += 1;
        }

        if (input[end] !== '}') {
            throw new Error('Unclosed XML expression interpolation');
        }

        const expression = input.slice(start + 2, node.end).trim();

        if (!expression) {
            throw new Error('Unclosed XML expression interpolation');
        }

        expressionNodeCache.set(expression, node);

        return { start, end, expression };
    } catch {
        throw new Error('Unclosed XML expression interpolation');
    }
}

/** Returns one standalone expression when the entire value is wrapped in `${...}`. */
function readStandaloneExpression(input: string): string | null {
    if (!input.startsWith('${')) return null;

    const segment = readInterpolationSegment(input, 0);

    return segment.end === input.length - 1 ? segment.expression : null;
}

/** Reads every `${...}` interpolation segment from a mixed string value. */
function readInterpolationSegments(input: string): InterpolationSegment[] {
    const segments: InterpolationSegment[] = [];

    for (let index = 0; index < input.length; index += 1) {
        if (input[index] !== '$' || input[index + 1] !== '{') continue;

        const segment = readInterpolationSegment(input, index);
        segments.push(segment);
        index = segment.end;
    }

    return segments;
}

/** Parses expressions ahead of first runtime evaluation when possible. */
export function prepareEvaluation(expr: string): void {
    const input = expr.trim();
    const standaloneExpression = readStandaloneExpression(input);

    if (standaloneExpression != null) {
        parseExpression(standaloneExpression);
        return;
    }

    if (input.includes('${') && !isReference(input)) {
        for (const segment of readInterpolationSegments(input)) {
            parseExpression(segment.expression);
        }
    }
}

/** Evaluates a supported AST node against the current scope. */
function evaluateNode(node: ExpressionNode, scope: Record<string, unknown> = {}): unknown {
    switch (node.type) {
        case 'Literal':
            return node.value;

        case 'Identifier':
            return isSafePropertyName(node.name as string) ? scope[node.name as string] : undefined;

        case 'ChainExpression':
            return evaluateNode(node.expression, scope);

        case 'MemberExpression': {
            const object = evaluateNode(node.object, scope);

            if (object == null) return undefined;

            if (node.computed) {
                const key = evaluateNode(node.property, scope);

                return key == null ? undefined : readSafeProperty(object, String(key));
            }

            if (node.property.type !== 'Identifier') {
                return undefined;
            }

            return readSafeProperty(object, node.property.name);
        }

        case 'BinaryExpression': {
            const left = evaluateNode(node.left, scope);
            const right = evaluateNode(node.right, scope);

            switch (node.operator) {
                case '+':
                    return (left as any) + (right as any);

                case '-':
                    return Number(left as any) - Number(right as any);

                case '*':
                    return Number(left as any) * Number(right as any);

                case '/':
                    return Number(left as any) / Number(right as any);

                case '%':
                    return Number(left as any) % Number(right as any);

                case '**':
                    return Number(left as any) ** Number(right as any);

                case '===':
                    return left === right;

                case '!==':
                    return left !== right;

                case '==':
                    return (left as any) == (right as any);

                case '!=':
                    return (left as any) != (right as any);

                case '<':
                    return (left as any) < (right as any);

                case '<=':
                    return (left as any) <= (right as any);

                case '>':
                    return (left as any) > (right as any);

                case '>=':
                    return (left as any) >= (right as any);

                case 'in': {
                    // Support pythonic membership checks against strings, arrays, and objects.
                    if (typeof right === 'string') {
                        return right.includes(String(left ?? ''));
                    }

                    if (Array.isArray(right)) {
                        return right.includes(left);
                    }

                    if (right != null && typeof right === 'object') {
                        const key = String(left);

                        return hasSafeProperty(right, key);
                    }

                    return false;
                }

                default:
                    throw new Error('Operator not allowed');
            }
        }

        case 'LogicalExpression': {
            const left = evaluateNode(node.left, scope);

            if (node.operator === '&&') return left ? evaluateNode(node.right, scope) : left;
            if (node.operator === '||') return left ? left : evaluateNode(node.right, scope);
            if (node.operator === '??') return left ?? evaluateNode(node.right, scope);

            throw new Error('Operator not allowed');
        }

        case 'UnaryExpression': {
            const value = evaluateNode(node.argument, scope);

            if (node.operator === '!') return !value;
            if (node.operator === '+') return Number(value);
            if (node.operator === '-') return -Number(value);

            throw new Error('Operator not allowed');
        }

        case 'ConditionalExpression':
            return evaluateNode(node.test, scope)
                ? evaluateNode(node.consequent, scope)
                : evaluateNode(node.alternate, scope);

        case 'CallExpression': {
            const callback = resolveSafeCall(node.callee);

            if (!callback) {
                if (node.optional) return undefined;

                throw new Error('Function call not allowed');
            }

            return callback(...node.arguments.map((argument) => evaluateNode(argument, scope)));
        }

        case 'ArrayExpression':
            return node.elements.map((element) => (element ? evaluateNode(element, scope) : null));

        case 'ObjectExpression':
            return node.properties.reduce<Record<string, unknown>>(
                (result, property) => {
                    if (property.type !== 'Property') return result;

                    const key =
                        property.key.type === 'Identifier'
                            ? property.key.name
                            : String(evaluateNode(property.key, scope));

                    // Skip prototype-related keys so XML object literals cannot mutate prototypes.
                    if (!isSafePropertyName(key)) return result;

                    result[key] = evaluateNode(property.value, scope);

                    return result;
                },
                Object.create(null) as Record<string, unknown>
            );

        case 'TemplateLiteral': {
            let output = '';

            for (let index = 0; index < node.quasis.length; index += 1) {
                output += node.quasis[index]?.value.cooked ?? '';

                if (index < node.expressions.length) {
                    const expression = node.expressions[index];

                    output += String(evaluateNode(expression, scope) ?? '');
                }
            }

            return output;
        }

        default:
            throw new Error(`Unsupported node: ${(node as { type: string }).type}`);
    }
}

/** Evaluates an XML attribute value against the current XML runtime scope. */
export function evaluate(expr: string, ctx: ExecutionContext): unknown {
    const input = expr.trim();
    const values = createScopeProxy(ctx);
    const standaloneExpression = readStandaloneExpression(input);

    /** Runs an expression with XML values exposed as local variables. */
    function run(expression: string, currentValues: Record<string, unknown>): unknown {
        return evaluateNode(parseExpression(expression), currentValues);
    }

    if (input === '') return '';

    /* Treat values that are fully wrapped in `${...}` as typed expressions. */
    if (standaloneExpression != null) {
        return run(standaloneExpression, values);
    }

    /* Resolve `$` references directly through the runtime scope. */
    if (isReference(input)) {
        return resolvePath(ctx, input.slice(1).split('.').filter(Boolean));
    }

    /* Resolve dotted paths like `user.name` against the runtime scope. */
    if (/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)+$/.test(input)) {
        return resolvePath(ctx, input.split('.'));
    }

    /* Interpolate `${...}` expressions inside mixed text values. */
    if (input.includes('${') && !isReference(input)) {
        let output = '';
        let cursor = 0;

        for (const segment of readInterpolationSegments(expr)) {
            output += expr.slice(cursor, segment.start);
            output += String(run(segment.expression, values) ?? '');
            cursor = segment.end + 1;
        }

        return output + expr.slice(cursor);
    }

    return expr;
}
