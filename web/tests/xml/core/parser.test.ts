import { describe, expect, it } from 'bun:test';
import { parseXML } from '@/xml/core/parser';

describe('parseXML', () => {
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

    /* Preserve nested and repeated elements while omitting compiler metadata. */
    it('parses page structure', () => {
        expect(
            parseXML(
                '<?xml version="1.0"?><longlink><!-- hidden --><Button i18n="actions.save" /><State id="first" /><State id="second" /></longlink>'
            )
        ).toEqual([
            {
                name: 'longlink',
                children: [
                    { name: 'Button', params: { i18n: 'actions.save' }, children: [] },
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
        expect(() => parseXML('<!DOCTYPE longlink><longlink />')).toThrow('XML DOCTYPE');
        expect(() => parseXML('<longlink><![CDATA[hidden]]></longlink>')).toThrow('XML DOCTYPE');
    });
});
