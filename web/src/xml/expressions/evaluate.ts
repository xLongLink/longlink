import type { AnyNode } from 'acorn';
import type { ASTAttribute, Scope } from '../types';
import { isSafePropertyName, readSafeProperty, resolvePath, resolveValue } from './resolve';

type SafeExpressionCall = (...args: unknown[]) => unknown;

/** Narrows an unknown value to a record with unknown values. */
function isRecord(value: unknown): value is Record<string, unknown> {
    return value != null && typeof value === 'object' && !Array.isArray(value);
}

const SAFE_IDENTIFIER_CALLS: Record<string, SafeExpressionCall> = {
    Boolean,
    Number,
    String,
    hasMissingRequiredValues: (definitions, values) => {
        // Ignore malformed metadata rather than blocking the workflow indefinitely.
        if (!Array.isArray(definitions) || !isRecord(values)) {
            return false;
        }

        // Require every definition explicitly marked as required to contain non-blank text.
        return definitions.some((definition) => {
            if (!isRecord(definition)) return false;

            const name = definition.name;
            const required = definition.required;
            const value = typeof name === 'string' ? values[name] : undefined;

            return required === true && (typeof value !== 'string' || value.trim().length === 0);
        });
    },
    nonEmpty: (value) => {
        // Ignore values that cannot contain named text fields.
        if (!isRecord(value)) return {};

        // Preserve only configured fields while omitting blank optional values.
        return Object.fromEntries(
            Object.entries(value).filter(([, entry]) => typeof entry === 'string' && entry.length > 0)
        );
    },
    hasConfiguredEnvironment: (configured, name) =>
        Array.isArray(configured) && typeof name === 'string' && configured.includes(name),
    hasMissingRequiredUpdateValues: (definitions, configured, values, removed) => {
        // Preserve configured required values unless the update explicitly removes them.
        if (!Array.isArray(definitions) || !Array.isArray(configured) || !isRecord(values) || !isRecord(removed)) {
            return false;
        }

        return definitions.some((definition) => {
            if (!isRecord(definition) || definition.required !== true || typeof definition.name !== 'string')
                return false;

            const name = definition.name;
            return (
                removed[name] === true ||
                (!configured.includes(name) && (typeof values[name] !== 'string' || values[name].trim().length === 0))
            );
        });
    },
    hasSolutionUpdateChanges: (candidate, values, removed) => {
        // A new image or any explicit environment replacement or removal permits submission.
        if (!isRecord(candidate) || !isRecord(values) || !isRecord(removed)) return false;

        const metadata = candidate.metadata;
        if (isRecord(metadata) && metadata.image !== candidate.current_image) return true;

        return (
            Object.keys(values).some((name) => isSafePropertyName(name)) ||
            Object.entries(removed).some(([name, value]) => isSafePropertyName(name) && value === true)
        );
    },
    imageDigest: (image) => {
        // Keep release comparison concise while retaining tag-only references unchanged.
        if (typeof image !== 'string') return '';

        const match = image.match(/@(sha256:[a-f0-9]{12})[a-f0-9]*$/);
        return match?.[1] ?? image;
    },
    updateEnvironmentPatch: (values, removed) => {
        // Send only edited values and explicit removals, leaving configured secrets untouched.
        const patch: Record<string, string | null> = {};

        if (isRecord(values)) {
            for (const [name, value] of Object.entries(values)) {
                if (isSafePropertyName(name) && typeof value === 'string') patch[name] = value;
            }
        }

        if (isRecord(removed)) {
            for (const [name, value] of Object.entries(removed)) {
                if (isSafePropertyName(name) && value === true) patch[name] = null;
            }
        }

        return patch;
    },
    trim: (value) => String(value ?? '').trim(),
};

/** Evaluates a supported AST node against the current scope. */
function evaluateNode(node: AnyNode, ctx: Scope): unknown {
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

                case '<':
                    return (left as number) < (right as number);

                case '<=':
                    return (left as number) <= (right as number);

                case '>':
                    return (left as number) > (right as number);

                case '>=':
                    return (left as number) >= (right as number);

                default:
                    throw new Error('Operator not allowed');
            }
        }

        case 'LogicalExpression': {
            const left = evaluateNode(node.left, ctx);

            // Evaluate logical AND lazily.
            if (node.operator === '&&') return left && evaluateNode(node.right, ctx);

            // Evaluate logical OR lazily.
            if (node.operator === '||') return left || evaluateNode(node.right, ctx);

            // Evaluate nullish coalescing lazily.
            if (node.operator === '??') return left ?? evaluateNode(node.right, ctx);

            throw new Error('Operator not allowed');
        }

        case 'ConditionalExpression':
            // Evaluate only the selected branch, matching JavaScript conditional semantics.
            return evaluateNode(node.test, ctx)
                ? evaluateNode(node.consequent, ctx)
                : evaluateNode(node.alternate, ctx);

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

        case 'CallExpression': {
            // Reject calls outside the allowlist.
            const callback =
                node.callee.type === 'Identifier'
                    ? readSafeProperty(SAFE_IDENTIFIER_CALLS, node.callee.name)
                    : undefined;
            if (!callback) {
                throw new Error('Function call not allowed');
            }

            return callback(...node.arguments.map((argument) => evaluateNode(argument, ctx)));
        }

        case 'ObjectExpression': {
            const result = Object.create(null) as Record<string, unknown>;

            // Reject spreads before evaluating object properties.
            for (const property of node.properties) {
                if (property.type === 'SpreadElement') {
                    throw new Error('Object spread not allowed');
                }

                // Evaluate computed keys while preserving literal identifier property names.
                const key =
                    !property.computed && property.key.type === 'Identifier'
                        ? property.key.name
                        : String(evaluateNode(property.key, ctx));

                // Skip prototype-related keys so XML object literals cannot mutate prototypes.
                if (!isSafePropertyName(key)) continue;

                result[key] = evaluateNode(property.value, ctx);
            }

            return result;
        }

        case 'TemplateLiteral': {
            let output = '';

            // Stitch cooked template chunks with evaluated expressions.
            for (let index = 0; index < node.quasis.length; index += 1) {
                output += node.quasis[index].value.cooked;

                // Insert the matching evaluated expression between chunks.
                if (index < node.expressions.length) {
                    const expression = node.expressions[index];

                    output += String(evaluateNode(expression, ctx) ?? '');
                }
            }

            return output;
        }

        default:
            throw new Error(`Unsupported node: ${node.type}`);
    }
}

/** Evaluates a compiled XML attribute against the current XML runtime scope. */
export function evaluate(attribute: ASTAttribute, ctx: Scope): unknown {
    switch (attribute.kind) {
        case 'text':
            return attribute.value;

        case 'path':
            return resolvePath(ctx, attribute.parts);

        case 'expression':
            return evaluateNode(attribute.node, ctx);

        case 'interpolation':
            return attribute.segments
                .map((segment) =>
                    segment.kind === 'text' ? segment.value : String(evaluateNode(segment.node, ctx) ?? '')
                )
                .join('');
    }
}
