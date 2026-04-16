import { describe, it, expect } from 'bun:test';
import { xmlToAST } from '../src/compiler';

describe('xmlToAST', () => {
    it('parses a simple element with no attributes or children', () => {
        const ast = xmlToAST('<Button />');
        expect(ast).toEqual([{ name: 'Button' }]);
    });

    it('parses element attributes as string params', () => {
        const ast = xmlToAST('<Input type="text" placeholder="Enter name" />');
        expect(ast).toEqual([
            {
                name: 'Input',
                params: { type: 'text', placeholder: 'Enter name' },
            },
        ]);
    });

    it('parses nested child elements', () => {
        const ast = xmlToAST('<Card><Title /><Body /></Card>');
        expect(ast).toEqual([
            {
                name: 'Card',
                children: [{ name: 'Title' }, { name: 'Body' }],
            },
        ]);
    });

    it('parses text content as a text node', () => {
        const ast = xmlToAST('<Label>Hello World</Label>');
        expect(ast).toEqual([
            {
                name: 'Label',
                children: [{ name: 'text', value: 'Hello World' }],
            },
        ]);
    });

    it('discards whitespace-only text nodes between elements', () => {
        // Whitespace between tags should not produce text nodes
        const ast = xmlToAST('<Row>  <Cell />  <Cell />  </Row>');
        expect(ast).toEqual([
            {
                name: 'Row',
                children: [{ name: 'Cell' }, { name: 'Cell' }],
            },
        ]);
    });

    it('numeric and expression attribute values remain as strings', () => {
        // parseAttributeValue is false, so all attribute values stay as strings
        const ast = xmlToAST('<Item count="42" active="true" expr="{x + 1}" />');
        expect(ast).toEqual([
            {
                name: 'Item',
                params: { count: '42', active: 'true', expr: '{x + 1}' },
            },
        ]);
    });

    it('returns multiple root-level siblings', () => {
        const ast = xmlToAST('<A /><B /><C />');
        expect(ast).toHaveLength(3);
        expect(ast.map((n) => n.name)).toEqual(['A', 'B', 'C']);
    });

    it('ignores XML declarations', () => {
        const ast = xmlToAST('<?xml version="1.0"?><Root />');
        expect(ast).toEqual([{ name: 'Root' }]);
    });

    it('returns an empty array for blank input', () => {
        const ast = xmlToAST('   ');
        expect(ast).toEqual([]);
    });

    it('omits params key when element has no attributes', () => {
        const [node] = xmlToAST('<Section />');
        expect(node).not.toHaveProperty('params');
    });

    it('omits children key when element has no children', () => {
        const [node] = xmlToAST('<Section />');
        expect(node).not.toHaveProperty('children');
    });
});
