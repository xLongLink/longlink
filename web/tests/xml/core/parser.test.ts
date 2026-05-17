import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';

describe('parseXML', () => {
    /* A single XML root should compile into the matching AST element. */
    it('parses a root element', () => {
        expect(parseXML('<longlink />')).toEqual([{ name: 'longlink' }]);
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
        expect(parseXML('<longlink><Button>Save</Button></longlink>')).toEqual([
            {
                name: 'longlink',
                children: [{ name: 'Button', children: [{ name: 'Text', params: { value: 'Save' } }] }],
            },
        ]);
    });

    /* Repeated sibling tags are represented as repeated AST nodes, not merged props. */
    it('flattens repeated sibling elements', () => {
        expect(parseXML('<longlink><State id="first" /><State id="second" /></longlink>')).toEqual([
            {
                name: 'longlink',
                children: [
                    { name: 'State', params: { id: 'first' } },
                    { name: 'State', params: { id: 'second' } },
                ],
            },
        ]);
    });

    /* Text nodes should preserve meaningful whitespace while whitespace-only nodes are removed. */
    it('preserves visible text and drops blank text nodes', () => {
        expect(parseXML('<longlink>  Hello, {user.name}  </longlink>')).toEqual([
            {
                name: 'longlink',
                children: [{ name: 'Text', params: { value: '  Hello, {user.name}  ' } }],
            },
        ]);
    });

    /* Compiler output should only include page elements, not XML declarations or comments. */
    it('ignores declarations and comments', () => {
        expect(parseXML('<?xml version="1.0"?><longlink><!-- hidden --><Button>Save</Button></longlink>')).toEqual([
            {
                name: 'longlink',
                children: [{ name: 'Button', children: [{ name: 'Text', params: { value: 'Save' } }] }],
            },
        ]);
    });
});
