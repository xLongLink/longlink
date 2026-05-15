import type { ExecutionContext } from '@xml/types';
import { parse } from 'acorn';
import { getVersion, snapshot } from 'valtio';

export type ExpressionResolver<T = unknown> = (ctx: ExecutionContext) => T;

type LiteralNode = {
    type: 'Literal';
    value: unknown;
};

type IdentifierNode = {
    type: 'Identifier';
    name: string;
};

type MemberExpressionNode = {
    type: 'MemberExpression';
    object: ExpressionNode;
    property: ExpressionNode;
    computed: boolean;
};

type ObjectExpressionNode = {
    type: 'ObjectExpression';
    properties: Array<
        | {
              type: 'Property';
              key: ExpressionNode;
              value: ExpressionNode;
              shorthand: boolean;
          }
        | { type: 'SpreadElement'; argument: ExpressionNode }
    >;
};

type TemplateLiteralNode = {
    type: 'TemplateLiteral';
    quasis: Array<{ value: { cooked: string } }>;
    expressions: ExpressionNode[];
};

type BinaryExpressionNode = {
    type: 'BinaryExpression';
    operator: '+' | '-' | '*' | '/';
    left: ExpressionNode;
    right: ExpressionNode;
};

type ArrayExpressionNode = {
    type: 'ArrayExpression';
    elements: Array<ExpressionNode | null>;
};

type ExpressionNode =
    | LiteralNode
    | IdentifierNode
    | MemberExpressionNode
    | BinaryExpressionNode
    | ArrayExpressionNode
    | ObjectExpressionNode
    | TemplateLiteralNode;

/** Parses an XML expression so unsupported syntax fails fast. */
function parseExpression(expression: string): ExpressionNode {
    const ast = parse(`(${expression})`, {
        ecmaVersion: 'latest',
        sourceType: 'script',
    }) as unknown as { body: Array<{ expression: ExpressionNode }> };

    return ast.body[0].expression;
}

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
                    return left + right;

                case '-':
                    return left - right;

                case '*':
                    return left * right;

                case '/':
                    return left / right;

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

/** Returns true when the input is wrapped in braces. */
export function isExpression(expr: string): boolean {
    const input = expr.trim();

    return input.startsWith('{') && input.endsWith('}');
}

/** Returns true when the input is a `$`-prefixed reference path. */
export function isReference(expr: string): boolean {
    const input = expr.trim();

    return /^\$[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(input);
}

/** Returns true when the input is a simple text string. */
export function isText(expr: string): boolean {
    const input = expr.trim();

    return input === '' || (!isExpression(input) && !isReference(input));
}

/** Creates a proxy that resolves identifiers through lexical parent contexts. */
function createScopeProxy(ctx: ExecutionContext): Record<string, unknown> {
    /** Resolves a value from the current XML runtime scope chain. */
    function resolve(ctx: ExecutionContext | null | undefined, key: string): unknown {
        if (!ctx) return undefined;

        /* Resolve against nested `values` first, then the flat context object. */
        const values = ctx.values ?? {};

        if (key in values) {
            const value = values[key];

            /* Unwrap scalar Valtio state objects like `{ value: "Ada" }` to plain values. */
            if (value && typeof value === 'object' && getVersion(value) !== undefined) {
                const data = snapshot(value as object) as Record<string, unknown>;

                if (Object.keys(data).length === 1 && 'value' in data) {
                    return data.value;
                }
            }

            return value;
        }

        if (key in ctx) {
            return (ctx as Record<string, unknown>)[key];
        }

        return resolve(ctx.parent, key);
    }

    return new Proxy(
        {},
        {
            has(_target, key) {
                /* Allow `with` lookups to flow through the scope chain instead of falling back to globals. */
                return typeof key === 'string';
            },
            get(_target, key) {
                return typeof key === 'string' ? resolve(ctx, key) : undefined;
            },
        }
    );
}

/** Evaluates an XML attribute value against the current XML runtime scope. */
export function evaluate(expr: string, ctx: ExecutionContext): unknown {
    const input = expr.trim();
    const values = createScopeProxy(ctx);

    /** Runs an expression with XML values exposed as local variables. */
    function run(expression: string, values: Record<string, unknown>): unknown {
        return evaluateNode(parseExpression(expression), values);
    }

    if (input === '') return '';

    /* Treat `{ ... }` and `{{ ... }}` as expressions. */
    if (isExpression(input)) {
        const inner = input.startsWith('{{') ? input.slice(2, -2).trim() : input.slice(1, -1).trim();
        try {
            return input.startsWith('{{') ? run(`({ ${inner} })`, values) : run(inner, values);
        } catch (error) {
            if (input.startsWith('{{') && error instanceof SyntaxError) {
                throw new Error(
                    `Invalid object expression "${expr}": use key/value pairs inside double braces, for example "{{ fullName: fullName }}" or shorthand "{{ fullName }}".`
                );
            }

            if (!input.startsWith('{{') && error instanceof SyntaxError) {
                return run(`({ ${inner} })`, values);
            }

            throw error;
        }
    }

    /* Resolve `$` references directly through the runtime scope. */
    if (isReference(input)) {
        const parts = input.slice(1).split('.').filter(Boolean);

        if (parts.length === 0) return undefined;

        let current: unknown = undefined;

        /* Find the root symbol in the current scope chain first. */
        for (let scope: ExecutionContext | null | undefined = ctx; scope; scope = scope.parent) {
            const values = scope.values ?? {};

            if (parts[0] in values) {
                current = values[parts[0]];
                break;
            }

            if (parts[0] in scope) {
                current = (scope as Record<string, unknown>)[parts[0]];
                break;
            }
        }

        /* Walk the remaining path segments directly on the live value. */
        for (const part of parts.slice(1)) {
            if (current == null) return undefined;
            current = (current as Record<string, unknown>)[part];
        }

        return current;
    }

    /* Resolve dotted paths like `user.name` against the runtime scope. */
    if (/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)+$/.test(input)) {
        const parts = input.split('.');

        let current: unknown = undefined;

        for (let scope: ExecutionContext | null | undefined = ctx; scope; scope = scope.parent) {
            const values = scope.values ?? {};

            if (parts[0] in values) {
                current = values[parts[0]];
                break;
            }

            if (parts[0] in scope) {
                current = (scope as Record<string, unknown>)[parts[0]];
                break;
            }
        }

        for (const part of parts.slice(1)) {
            if (current == null) return undefined;

            current = (current as Record<string, unknown>)[part];
        }

        return current;
    }

    /* Interpolate single-brace expressions inside mixed text values. */
    if (input.includes('{') && !isExpression(input) && !isReference(input)) {
        return expr.replace(/\{([^{}]+)\}/g, (_match, expression: string) => String(run(expression, values) ?? ''));
    }

    return expr;
}

/** Compiles an XML expression into a function evaluated later with ctx. */
export function compile(expr: string): ExpressionResolver {
    return (ctx) => evaluate(expr, ctx);
}
