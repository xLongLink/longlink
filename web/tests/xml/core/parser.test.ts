import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';

describe('parseXML', () => {
    /* A single XML root should compile into the matching AST element. */
    it('parses a root element', () => {
        expect(parseXML('<longlink />')).toEqual([{ name: 'longlink', children: [] }]);
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
                children: [],
            },
        ]);
    });

    /* Nested XML tags should remain nested AST children in source order. */
    it('parses nested child elements', () => {
        expect(parseXML('<longlink><Button i18n="actions.save" /></longlink>')).toEqual([
            {
                name: 'longlink',
                children: [{ name: 'Button', params: { i18n: 'actions.save' }, children: [] }],
            },
        ]);
    });

    /* Repeated sibling tags are represented as repeated AST nodes, not merged props. */
    it('flattens repeated sibling elements', () => {
        expect(parseXML('<longlink><State id="first" /><State id="second" /></longlink>')).toEqual([
            {
                name: 'longlink',
                children: [
                    { name: 'State', params: { id: 'first' }, children: [] },
                    { name: 'State', params: { id: 'second' }, children: [] },
                ],
            },
        ]);
    });

    /* Whitespace-only nodes are removed while visible character data is rejected. */
    it('drops blank text nodes', () => {
        expect(parseXML('<longlink>   </longlink>')).toEqual([
            {
                name: 'longlink',
                children: [],
            },
        ]);
    });

    it('rejects visible text nodes', () => {
        expect(() => parseXML('<longlink>  Hello, ${user.name}  </longlink>')).toThrow(
            'Literal text is not supported in XML; use i18n attributes instead'
        );
    });

    it('rejects malformed XML', () => {
        expect(() => parseXML('<longlink><Button></longlink>')).toThrow('XML is invalid');
    });

    /* Compiler output should only include page elements, not XML declarations or comments. */
    it('ignores declarations and comments', () => {
        expect(
            parseXML('<?xml version="1.0"?><longlink><!-- hidden --><Button i18n="actions.save" /></longlink>')
        ).toEqual([
            {
                name: 'longlink',
                children: [{ name: 'Button', params: { i18n: 'actions.save' }, children: [] }],
            },
        ]);
    });
});
