import { describe, expect, it } from 'bun:test';
import { xmlToAST } from '../../src/xml/compiler';

describe('xmlToAST', () => {
    /* A single XML root should compile into the matching AST element. */
    it('parses a root element', () => {
        expect(xmlToAST('<Page />')).toEqual([{ name: 'Page' }]);
    });

    /* XML attributes are component props and must stay as strings for runtime resolution. */
    it('keeps attributes as string params', () => {
        expect(xmlToAST('<Button disabled="false" count="5" label="Save" />')).toEqual([
            {
                name: 'Button',
                params: {
                    count: '5',
                    disabled: 'false',
                    label: 'Save',
                },
            },
        ]);
    });

    /* $ bindings are runtime signals and must compile as literal attribute values. */
    it('preserves $ binding params', () => {
        expect(xmlToAST('<Input value="$user.name" placeholder="$user.placeholder" />')).toEqual([
            {
                name: 'Input',
                params: {
                    placeholder: '$user.placeholder',
                    value: '$user.name',
                },
            },
        ]);
    });

    /* Nested XML tags should remain nested AST children in source order. */
    it('parses nested child elements', () => {
        expect(xmlToAST('<Page><Stack><Button>Save</Button></Stack></Page>')).toEqual([
            {
                name: 'Page',
                children: [
                    {
                        name: 'Stack',
                        children: [
                            {
                                name: 'Button',
                                children: [{ name: 'Text', children: 'Save' }],
                            },
                        ],
                    },
                ],
            },
        ]);
    });

    /* Repeated sibling tags are represented as repeated AST nodes, not merged props. */
    it('flattens repeated sibling elements', () => {
        expect(xmlToAST('<Page><State id="first" /><State id="second" /></Page>')).toEqual([
            {
                name: 'Page',
                children: [
                    { name: 'State', params: { id: 'first' } },
                    { name: 'State', params: { id: 'second' } },
                ],
            },
        ]);
    });

    /* Text nodes should preserve meaningful whitespace while whitespace-only nodes are removed. */
    it('preserves visible text and drops blank text nodes', () => {
        expect(xmlToAST('<Page>  Hello, {user.name}  </Page>')).toEqual([
            {
                name: 'Page',
                children: [{ name: 'Text', children: '  Hello, {user.name}  ' }],
            },
        ]);
    });

    /* Compiler output should only include page elements, not XML declarations or comments. */
    it('ignores declarations and comments', () => {
        expect(xmlToAST('<?xml version="1.0"?><Page><!-- hidden --><Button>Save</Button></Page>')).toEqual([
            {
                name: 'Page',
                children: [{ name: 'Button', children: [{ name: 'Text', children: 'Save' }] }],
            },
        ]);
    });
});
