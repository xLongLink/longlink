import { createContext, useContext as useReactContext, type ReactNode } from 'react';
import { renderXml } from './renderers';
import type { ExecutionContext, RuntimeOptions, RuntimeState, SetterContext } from './types';

const ValueContext = createContext<ExecutionContext>({});
const OptionsContext = createContext<RuntimeOptions>({});
const SetterContextValue = createContext<SetterContext>({});
export const RuntimeContext = createContext<RuntimeState | null>(null);

/** Evaluates an XML attribute value against the current flat XML context. */
export function evaluate(expr: string, ctx: ExecutionContext): unknown;
export function evaluate(expr: string, ctx: ExecutionContext, type: 'string'): string;
export function evaluate(expr: string, ctx: ExecutionContext, type: 'number'): number;
export function evaluate(expr: string, ctx: ExecutionContext, type: 'boolean'): boolean;
export function evaluate(expr: string, values: ExecutionContext, type?: 'string' | 'number' | 'boolean'): unknown {
    const input = expr.trim();

    if (input === '') return coerceValue('', type);

    if (input.startsWith('$')) {
        return coerceValue(readPath(values, input.slice(1).trim()), type);
    }

    if (input.startsWith('[') || input.startsWith('{"')) {
        try {
            return coerceValue(JSON.parse(input), type);
        } catch {
            // JSON attributes may contain string placeholders such as "{issue.title}".
        }

        try {
            const interpolated = input.replace(/\{([^{}]+)\}/g, (_match, expression: string) =>
                String(runExpression(expression, values) ?? '')
            );

            return coerceValue(JSON.parse(interpolated), type);
        } catch {
            // Fall through so malformed JSON can still be handled as a literal string.
        }
    }

    if (input.startsWith('{') && input.endsWith('}')) {
        const expression = input.slice(1, -1).trim();
        const expressionValue = /^[A-Za-z_$][\w$]*\s*:/.test(expression) ? input : expression;

        return coerceValue(runExpression(expressionValue, values), type);
    }

    if (input.includes('{')) {
        return coerceValue(
            expr.replace(/\{([^}]+)\}/g, (_match, expression: string) =>
                String(runExpression(expression, values) ?? '')
            ),
            type
        );
    }

    return coerceValue(inferLiteral(expr), type);
}

/** Resolves an XML `if` attribute to a render decision. */
export function resolveCondition(condition: string | undefined, ctx: ExecutionContext): boolean {
    if (condition == null) return true;

    return Boolean(evaluate(condition, ctx, 'boolean'));
}

/** Resolves a $ target into its current value and setter. */
export function resolveBinding(
    target: string,
    ctx: ExecutionContext,
    setters: SetterContext = {}
): { value: unknown; setValue: (value: unknown) => void } {
    const normalized = target.trim();
    const dotIndex = normalized.indexOf('.');
    const stateKey = dotIndex === -1 ? normalized : normalized.slice(0, dotIndex);
    const propPath = dotIndex === -1 ? [] : normalized.slice(dotIndex + 1).split('.');
    const setter = setters[stateKey];

    if (!stateKey || !setter) {
        throw new Error(`Unknown state "${stateKey}"`);
    }

    return {
        value: readPath(ctx, normalized),
        setValue: (value: unknown) => {
            if (propPath.length === 0) {
                setter(value);
                return;
            }

            setter(setPath(ctx[stateKey], propPath, value));
        },
    };
}

/** Provides XML value and setter contexts to a rendered subtree. */
export function RuntimeProvider({ value, children }: { value: RuntimeState; children: ReactNode }) {
    const parentOptions = useReactContext(OptionsContext);
    const parentSetters = useReactContext(SetterContextValue);
    const options = value.options ?? parentOptions;
    const setters = value.setters ?? parentSetters;

    return (
        <ValueContext.Provider value={value.ctx}>
            <OptionsContext.Provider value={options}>
                <SetterContextValue.Provider value={setters}>
                    <RuntimeContext.Provider value={{ ...value, options, setters }}>{children}</RuntimeContext.Provider>
                </SetterContextValue.Provider>
            </OptionsContext.Provider>
        </ValueContext.Provider>
    );
}

/** Returns the active XML runtime state. */
export function useContext(): RuntimeState {
    const runtime = useReactContext(RuntimeContext);
    const ctx = useReactContext(ValueContext);
    const options = useReactContext(OptionsContext);
    const setters = useReactContext(SetterContextValue);

    if (!runtime) {
        throw new Error('useContext must be used inside a rendered XML component');
    }

    return { ...runtime, ctx, options, setters };
}

/** Renders the current runtime node children. */
export function RuntimeChildren() {
    const { children } = useContext();

    return renderXml(children);
}

/** Runs an expression with XML values exposed as local variables. */
function runExpression(expression: string, values: ExecutionContext): unknown {
    return new Function('ctx', `with (ctx) { return (${expression}); }`)(values);
}

/** Infers primitive values from literal XML attribute text. */
function inferLiteral(value: string): unknown {
    const input = value.trim();

    if (input === '') return '';
    if (input === 'null') return null;
    if (input === 'undefined') return undefined;
    if (input === 'true') return true;
    if (input === 'false') return false;

    const numberValue = Number(input);
    if (Number.isFinite(numberValue) && String(numberValue) === input) return numberValue;

    if ((input.startsWith('{') && input.endsWith('}')) || (input.startsWith('[') && input.endsWith(']'))) {
        try {
            return JSON.parse(input);
        } catch {
            return value;
        }
    }

    return value;
}

/** Coerces any resolved value into the requested primitive type. */
function coerceValue(value: unknown, type?: 'string' | 'number' | 'boolean'): unknown {
    if (type === 'string') return String(value ?? '');
    if (type === 'number') return typeof value === 'number' ? value : Number(value);
    if (type === 'boolean') return Boolean(value);

    return value;
}

/** Reads a dotted path from the flat XML context. */
function readPath(values: ExecutionContext, path: string): unknown {
    if (!path) return undefined;

    return path.split('.').reduce<unknown>((current, segment) => {
        if (current == null || typeof current !== 'object') return undefined;

        return (current as Record<string, unknown>)[segment];
    }, values);
}

/** Returns a copied object with a dotted-path value replaced. */
function setPath(value: unknown, path: string[], nextValue: unknown): unknown {
    if (path.length === 0) return nextValue;

    const [head, ...tail] = path;
    const source = value && typeof value === 'object' ? value : {};

    return {
        ...(source as Record<string, unknown>),
        [head!]: setPath((source as Record<string, unknown>)[head!], tail, nextValue),
    };
}
