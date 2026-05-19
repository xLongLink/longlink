import { parse } from 'acorn';
import type { ExecutionContext } from '../../types';

import { createScopeProxy, resolvePath } from './resolve';
import type { ExpressionNode } from './types';
import { isReference } from './utils';

/** Evaluates a supported AST node against the current scope. */
function evaluateNode(node: ExpressionNode, scope: Record<string, unknown> = {}): unknown {
    switch (node.type) {
        case 'Literal':
            return node.value;

        case 'Identifier':
            return scope[node.name as string];

        case 'MemberExpression': {
            const object = evaluateNode(node.object, scope);

            if (object == null) return undefined;

            if (node.computed) {
                const key = evaluateNode(node.property, scope);

                return key == null ? undefined : (object as Record<string, unknown>)[String(key)];
            }

            if (node.property.type !== 'Identifier') {
                return undefined;
            }

            return (object as Record<string, unknown>)[node.property.name];
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

                case 'in': {
                    // Support pythonic membership checks against strings, arrays, and objects.
                    if (typeof right === 'string') {
                        return right.includes(String(left ?? ''));
                    }

                    if (Array.isArray(right)) {
                        return right.includes(left);
                    }

                    if (right != null && typeof right === 'object') {
                        return String(left) in (right as Record<string, unknown>);
                    }

                    return false;
                }

                default:
                    throw new Error('Operator not allowed');
            }
        }

        case 'ArrayExpression':
            return node.elements.map((element) => (element ? evaluateNode(element, scope) : null));

        case 'ObjectExpression':
            return node.properties.reduce<Record<string, unknown>>((result, property) => {
                if (property.type !== 'Property') return result;

                const key =
                    property.key.type === 'Identifier' ? property.key.name : String(evaluateNode(property.key, scope));

                result[key] = evaluateNode(property.value, scope);

                return result;
            }, {});

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
    let isWrappedExpression = false;

    /** Runs an expression with XML values exposed as local variables. */
    function run(expression: string, currentValues: Record<string, unknown>): unknown {
        const ast = parse(`(${expression})`, {
            ecmaVersion: 'latest',
            sourceType: 'script',
        }) as unknown as { body: Array<{ expression: ExpressionNode }> };

        return evaluateNode(ast.body[0].expression, currentValues);
    }

    if (input === '') return '';

    /* Treat values that are fully wrapped in `${...}` as expressions. */
    if (input.startsWith('${') && input.endsWith('}')) {
        let depth = 0;
        isWrappedExpression = true;

        for (let index = 0; index < input.length; index += 1) {
            const char = input[index];

            if (char === '{') {
                depth += 1;
            } else if (char === '}') {
                depth -= 1;

                if (depth < 0) {
                    isWrappedExpression = false;
                    break;
                }

                if (depth === 0 && index < input.length - 1) {
                    isWrappedExpression = false;
                    break;
                }
            }
        }

        isWrappedExpression = isWrappedExpression && depth === 0;

        if (isWrappedExpression) {
            const inner = input.slice(2, -1).trim();

            return run(inner, values);
        }
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
    if (input.includes('${') && !isWrappedExpression && !isReference(input)) {
        return expr.replace(/\$\{([^{}]+)\}/g, (_match, expression: string) => String(run(expression, values) ?? ''));
    }

    return expr;
}
