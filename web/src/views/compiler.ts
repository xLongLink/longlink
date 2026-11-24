import * as React from 'react';
import { transform } from 'sucrase';
import * as components from './index';

type ViewComponent = React.ComponentType<{ params: Readonly<Record<string, string>> }>;

/** Compiles authored source for evaluation inside the sandbox, never the Platform module graph. */
export function compileView(source: string): ViewComponent {
    const code = transform(source, {
        transforms: ['jsx', 'imports'],
        jsxRuntime: 'classic',
        jsxPragma: '__jsx',
        jsxFragmentPragma: '__fragment',
        production: true
    }).code;
    const bindings = { __jsx: React.createElement, __fragment: React.Fragment, ...components };
    const module = { exports: {} };

    // oxlint-disable-next-line typescript/no-implied-eval -- Production calls this only inside the opaque-origin sandbox.
    const evaluate = new Function(
        'module',
        'exports',
        ...Object.keys(bindings),
        `${code}\nreturn module.exports.default;`
    );
    const component: unknown = evaluate(module, module.exports, ...Object.values(bindings));

    if (!(component instanceof Function)) throw new Error('A View must export a component as default');

    // SAFETY: Callable exports pass admission above; the error boundary handles invalid React rendering.
    return component as ViewComponent;
}
