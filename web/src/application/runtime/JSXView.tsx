import * as UI from '@astryxdesign/core';
import * as React from 'react';
import { type ComponentType } from 'react';

/** Compiles one JSX Application page with the LongLink-provided globals. */
export async function compileJSXView(content: string): Promise<ComponentType> {
    const defaultExport = content.match(/export\s+default\s+function\s+([A-Za-z_$][\w$]*)\s*\(/);
    const componentName = defaultExport?.[1] ?? 'App';
    const source = content
        .replace(
            /^\s*import\s*\{([^}]+)\}\s*from\s*['"]@ui['"]\s*;?\s*$/gm,
            (_, imports: string) => `const { ${imports.replace(/\s+as\s+/g, ': ')} } = UI;`
        )
        .replace(/export\s+default\s+function\s+([A-Za-z_$][\w$]*)/g, 'function $1');

    // JSX pages may depend only on the LongLink-provided Astryx surface.
    if (/^\s*import\s/m.test(source)) {
        throw new Error("JSX pages may import only from '@ui'");
    }

    // Load Babel only for JSX pages so ordinary XML Applications avoid its compiler-sized chunk.
    const babel = await import('@babel/standalone');
    const compiled = babel.transform(source, { filename: 'page.jsx', presets: ['react'] }).code;

    // Compile Application-owned source inside the intentionally isolated JSX runtime.
    // oxlint-disable-next-line typescript/no-implied-eval
    const component = new globalThis.Function('React', 'UI', `${compiled}\nreturn ${componentName};`)(
        React,
        UI
    ) as unknown;

    if (typeof component !== 'function') {
        throw new Error(`JSX pages must declare a '${componentName}' component`);
    }

    return component as ComponentType;
}

/** Renders one compiled JSX Application page. */
export function JSXView({ component: Page }: { component: ComponentType }) {
    return <Page />;
}
