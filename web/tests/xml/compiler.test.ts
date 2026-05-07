import { parseXML } from '@xml/parser';
import { describe, expect, it } from 'bun:test';

describe('parseXML', () => {
    /* A single XML root should compile into the matching AST element. */
    it('parses a root element', () => {
        expect(parseXML('<Page />')).toEqual([{ name: 'Page' }]);
    });

    /* XML attributes are component props and must stay as strings for runtime resolution. */
    it('keeps attributes as string params', () => {
        expect(parseXML('<Button disabled="false" count="5" label="Save" />')).toEqual([
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

    /* Input values should remain plain expressions in compiled XML. */
    it('preserves input expression params', () => {
        expect(parseXML('<Input value="user.name" placeholder="user.placeholder" />')).toEqual([
            {
                name: 'Input',
                params: {
                    placeholder: 'user.placeholder',
                    value: 'user.name',
                },
            },
        ]);
    });

    /* Nested XML tags should remain nested AST children in source order. */
    it('parses nested child elements', () => {
        expect(parseXML('<Page><Button>Save</Button></Page>')).toEqual([
            {
                name: 'Page',
                children: [{ name: 'Button', children: [{ name: 'Text', children: 'Save' }] }],
            },
        ]);
    });

    /* Repeated sibling tags are represented as repeated AST nodes, not merged props. */
    it('flattens repeated sibling elements', () => {
        expect(parseXML('<Page><State id="first" /><State id="second" /></Page>')).toEqual([
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
        expect(parseXML('<Page>  Hello, {user.name}  </Page>')).toEqual([
            {
                name: 'Page',
                children: [{ name: 'Text', children: '  Hello, {user.name}  ' }],
            },
        ]);
    });

    /* Compiler output should only include page elements, not XML declarations or comments. */
    it('ignores declarations and comments', () => {
        expect(parseXML('<?xml version="1.0"?><Page><!-- hidden --><Button>Save</Button></Page>')).toEqual([
            {
                name: 'Page',
                children: [{ name: 'Button', children: [{ name: 'Text', children: 'Save' }] }],
            },
        ]);
    });
});
