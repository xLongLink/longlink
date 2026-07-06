import { RenderXML } from '@/xml/renderers.tsx';
import type { ASTNode, ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('renderNode', () => {
    it('resolves localized text through XML adapters', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            translations: { copy: { count: 'Count {{count}}' } },
            values: {},
            count: 7,
        };
        expect(
            renderToStaticMarkup(
                createElement(
                    'div',
                    null,
                    createElement(RenderXML, {
                        ast: [{ name: 'P', params: { count: '${count}', i18n: 'copy.count' } }],
                        ctx,
                    })
                )
            )
        ).toContain('Count 7');
    });

    it('waits for translations before browser renders localized XML', () => {
        const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };

        Object.defineProperty(globalThis, 'document', { configurable: true, value: {} });

        try {
            expect(
                renderToStaticMarkup(
                    createElement(
                        'div',
                        null,
                        createElement(RenderXML, { ast: [{ name: 'P', params: { i18n: 'copy.loading' } }], ctx })
                    )
                )
            ).toBe('<div></div>');
        } finally {
            if (descriptor) {
                Object.defineProperty(globalThis, 'document', descriptor);
            } else {
                delete (globalThis as { document?: unknown }).document;
            }
        }
    });

    it('skips nodes when if condition is false', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const node: ASTNode = { name: 'Button', params: { if: '${false}' } };
        expect(renderToStaticMarkup(createElement('div', null, createElement(RenderXML, { ast: [node], ctx })))).toBe(
            '<div></div>'
        );
    });

    it('throws on unknown component', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        expect(() =>
            renderToStaticMarkup(
                createElement('div', null, createElement(RenderXML, { ast: [{ name: 'Unknown' }], ctx }))
            )
        ).toThrow('Unknown component "Unknown"');
    });

    it('resolves props from expressions', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {}, count: 2 };
        const node: ASTNode = { name: 'Input', params: { label: '${`Count: ${count}`}' } };
        expect(
            renderToStaticMarkup(createElement('div', null, createElement(RenderXML, { ast: [node], ctx })))
        ).toContain('Count: 2');
    });

    it('resolves input props from expressions', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
            form: { value: 'Ada', placeholder: 'Enter name' },
        };
        const node: ASTNode = { name: 'Input', params: { value: 'form.value', placeholder: 'form.placeholder' } };
        const output = renderToStaticMarkup(createElement('div', null, createElement(RenderXML, { ast: [node], ctx })));
        expect(output).toContain('value="Ada"');
        expect(output).toContain('placeholder="Enter name"');
    });
});
