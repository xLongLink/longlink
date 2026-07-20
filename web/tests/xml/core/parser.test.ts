import { describe, expect, it } from 'bun:test';
import { parseXML } from '@/xml/core/parser';

describe('parseXML', () => {
    /* XML attributes are component props and must stay as strings for runtime resolution. */
    it('keeps attributes as string params', () => {
        expect(parseXML('<Button isDisabled="false" count="5" label="Save" />')).toEqual([
            {
                name: 'Button',
                params: {
                    count: '5',
                    isDisabled: 'false',
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
                `<?xml version="1.0"?>
                <longlink>
                    <!-- hidden -->
                    <Button i18n="actions.save" />
                    <State id="first" />
                    <State id="second" />
                </longlink>`
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

    it('rejects visible text nodes', () => {
        expect(() => parseXML('<longlink>  Hello, ${user.name}  </longlink>')).toThrow(
            'Literal text is not supported in XML; use i18n attributes instead'
        );
    });

    it('rejects malformed XML', () => {
        expect(() => parseXML('<longlink><Button></longlink>')).toThrow('XML is invalid');
    });

    it('rejects unsupported XML constructs', () => {
        const unsupportedXml = [
            '<!DOCTYPE longlink><longlink />',
            '<!ENTITY hidden "value"><longlink />',
            '<longlink><![CDATA[hidden]]></longlink>',
        ];

        for (const xml of unsupportedXml) {
            expect(() => parseXML(xml)).toThrow('XML DOCTYPE, ENTITY, and CDATA constructs are not supported');
        }
    });
});
