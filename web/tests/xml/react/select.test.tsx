import { xmlToAST } from '@/xml/compiler';
import { Select } from '@/xml/react/Select';
import { render } from '@/xml/renderers';
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
        const ast = xmlToAST('<Select label="Mode" options=\'[{"label":"Open","value":"open"}]\' />');
        const renderedTree = render(ast, ctx);

        expect(renderToStaticMarkup(createElement('div', null, renderedTree))).toContain('Mode');
    });

    /* The adapter should render evaluated XML props directly. */
    it('renders label text directly', () => {
        expect(renderToStaticMarkup(createElement(Select, { props: { label: 'Mode' } }))).toContain('Mode');
    });
});
