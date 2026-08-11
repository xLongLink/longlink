import type { ExecutionContext } from '../types';
import type { ASTAttribute } from '../types';
import { hasSafeProperty, isSafePropertyName, readSafeProperty, resolvePath, resolveValue } from './resolve';
import type { ExpressionNode } from './types';

type SafeExpressionCall = (...args: unknown[]) => unknown;

const SAFE_IDENTIFIER_CALLS: Record<string, SafeExpressionCall> = {
    Boolean,
    Number,
    String,
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

/** Resolves a whitelisted global helper call without exposing runtime objects. */
function resolveSafeCall(callee: ExpressionNode): SafeExpressionCall | undefined {
    // Unwrap optional chains before resolving the callee.
    if (callee.type === 'ChainExpression') {
        return resolveSafeCall(callee.expression);
    }

    // Allow direct calls to whitelisted helpers.
    if (callee.type === 'Identifier') {
        const value = readSafeProperty(SAFE_IDENTIFIER_CALLS, callee.name);

        return value;
    }

    // Allow selected static helper namespaces.
    if (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.object.type === 'Identifier' &&
        callee.property.type === 'Identifier'
    ) {
        // Resolve safe Array helpers.
        if (callee.object.name === 'Array') {
            return callee.property.name === 'isArray' ? Array.isArray : undefined;
        }

        // Resolve safe Math helpers.
        if (callee.object.name === 'Math') {
            const value = readSafeProperty(SAFE_MATH_CALLS, callee.property.name);

            return value;
        }
    }

    return undefined;
}

/** Evaluates a supported AST node against the current scope. */
function evaluateNode(node: ExpressionNode, ctx: ExecutionContext): unknown {
    // Dispatch by supported AST node type.
    switch (node.type) {
        case 'Literal':
            return node.value;

        case 'Identifier':
            return resolveValue(ctx, node.name);

        case 'ChainExpression':
            return evaluateNode(node.expression, ctx);

        case 'MemberExpression': {
            // Stop property reads on nullish objects.
            const object = evaluateNode(node.object, ctx);
            if (object == null) return undefined;

            // Resolve computed property keys through the evaluator.
            if (node.computed) {
                const key = evaluateNode(node.property, ctx);

                return key == null ? undefined : readSafeProperty(object, String(key));
            }

            // Only identifier properties are allowed for direct access.
            if (node.property.type !== 'Identifier') {
                return undefined;
            }

            return readSafeProperty(object, node.property.name);
        }

        case 'BinaryExpression': {
            const left = evaluateNode(node.left, ctx);
            const right = evaluateNode(node.right, ctx);

            // Apply only allowed binary operators.
            switch (node.operator) {
                case '+':
                    return (left as number) + (right as number);

                case '-':
                    return Number(left) - Number(right);

                case '*':
                    return Number(left) * Number(right);

                case '/':
                    return Number(left) / Number(right);

                case '%':
                    return Number(left) % Number(right);

                case '**':
                    return Number(left) ** Number(right);

                case '===':
                    return left === right;

                case '!==':
                    return left !== right;

                case '==':
                    return (left as number) == (right as number);

                case '!=':
                    return (left as number) != (right as number);

                case '<':
                    return (left as number) < (right as number);

                case '<=':
                    return (left as number) <= (right as number);

                case '>':
                    return (left as number) > (right as number);

                case '>=':
                    return (left as number) >= (right as number);

                case 'in': {
                    // Support pythonic membership checks against strings, arrays, and objects.
                    if (typeof right === 'string') {
                        return right.includes(String(left ?? ''));
                    }

                    // Check array membership directly.
                    if (Array.isArray(right)) {
                        return right.includes(left);
                    }

                    // Check object membership through safe keys.
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
            const left = evaluateNode(node.left, ctx);

            // Evaluate logical AND lazily.
            if (node.operator === '&&') return left ? evaluateNode(node.right, ctx) : left;

            // Evaluate logical OR lazily.
            if (node.operator === '||') return left ? left : evaluateNode(node.right, ctx);

            // Evaluate nullish coalescing lazily.
            if (node.operator === '??') return left ?? evaluateNode(node.right, ctx);

            throw new Error('Operator not allowed');
        }

        case 'UnaryExpression': {
            const value = evaluateNode(node.argument, ctx);

            // Negate truthiness for bang expressions.
            if (node.operator === '!') return !value;

            // Coerce unary plus to a number.
            if (node.operator === '+') return Number(value);

            // Apply numeric negation.
            if (node.operator === '-') return -Number(value);

            throw new Error('Operator not allowed');
        }

        case 'ConditionalExpression':
            return evaluateNode(node.test, ctx)
                ? evaluateNode(node.consequent, ctx)
                : evaluateNode(node.alternate, ctx);

        case 'CallExpression': {
            // Reject calls outside the allowlist.
            const callback = resolveSafeCall(node.callee);
            if (!callback) {
                // Optional calls resolve to undefined when missing.
                if (node.optional) return undefined;

                throw new Error('Function call not allowed');
            }

            return callback(...node.arguments.map((argument) => evaluateNode(argument, ctx)));
        }

        case 'ArrayExpression':
            return node.elements.map((element) => (element ? evaluateNode(element, ctx) : null));

        case 'ObjectExpression':
            return node.properties.reduce<Record<string, unknown>>((result, property) => {
                // Ignore entries that are not plain properties.
                if (property.type !== 'Property') return result;

                const key =
                    property.key.type === 'Identifier' ? property.key.name : String(evaluateNode(property.key, ctx));

                // Skip prototype-related keys so XML object literals cannot mutate prototypes.
                if (!isSafePropertyName(key)) return result;

                result[key] = evaluateNode(property.value, ctx);

                return result;
            }, Object.create(null));

        case 'TemplateLiteral': {
            let output = '';

            // Stitch cooked template chunks with evaluated expressions.
            for (let index = 0; index < node.quasis.length; index += 1) {
                output += node.quasis[index]?.value.cooked ?? '';

                // Insert the matching evaluated expression between chunks.
                if (index < node.expressions.length) {
                    const expression = node.expressions[index];

                    output += String(evaluateNode(expression, ctx) ?? '');
                }
            }

            return output;
        }

        default:
            throw new Error(`Unsupported node: ${(node as { type: string }).type}`);
    }
}

/** Evaluates a compiled XML attribute against the current XML runtime scope. */
export function evaluate(attribute: ASTAttribute, ctx: ExecutionContext): unknown {
    switch (attribute.kind) {
        case 'text':
            return attribute.value;

        case 'path':
            return resolvePath(ctx, attribute.parts);

        case 'expression':
            return evaluateNode(attribute.node, ctx);

        case 'interpolation':
            return attribute.segments.map((segment) =>
                segment.kind === 'text' ? segment.value : String(evaluateNode(segment.node, ctx) ?? '')
            ).join('');
    }
}
