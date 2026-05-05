import { xmlToAST } from '@/xml/compiler';
import { Select } from '@/xml/react/Select';
import { registry } from '@/xml/registry';
import { renderNode } from '@/xml/renderers';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Select', () => {
    /* The compiler should preserve select attributes and option structure. */
    it('compiles select xml into a select ast node', () => {
        expect(xmlToAST('<Select label="Mode" />')).toEqual([{ name: 'Select', params: { label: 'Mode' } }]);
    });

    /* The runtime should render select XML into the expected markup. */
    it('renders raw xml select content end to end', () => {
        const ctx: ExecutionContext = { state: {}, queries: {}, scope: {} };
        const ast = xmlToAST('<Select label="Mode" submit="Save" />');
        const renderedTree = renderNode(ast, registry, ctx);

        expect(renderToStaticMarkup(createElement('div', null, renderedTree))).toContain('Save');
    });

    /* The adapter should preserve the submit button when rendered directly. */
    it('renders a submit button directly', () => {
        expect(renderToStaticMarkup(createElement(Select, { submit: 'Save' }))).toContain('Save');
    });
});
