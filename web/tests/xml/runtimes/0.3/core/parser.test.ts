import { describe, expect, it } from 'vitest';
import { parseXML } from '@/xml/runtimes/0.3/core/parser';

describe('parseXML', () => {
    /* XML attributes are compiled without resolving runtime values. */
    it('compiles literal attribute params', () => {
        expect(parseXML('<Button isDisabled="false" count="5" label="Save" />')).toEqual([
            {
                name: 'Button',
                params: {
                    count: { kind: 'text', value: '5' },
                    isDisabled: { kind: 'text', value: 'false' },
                    label: { kind: 'text', value: 'Save' },
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
                    <Button label="Save" />
                    <State id="first" />
                    <State id="second" />
                </longlink>`
            )
        ).toEqual([
            {
                name: 'longlink',
                params: {},
                children: [
                    { name: 'Button', params: { label: { kind: 'text', value: 'Save' } }, children: [] },
                    { name: 'State', params: { id: { kind: 'text', value: 'first' } }, children: [] },
                    { name: 'State', params: { id: { kind: 'text', value: 'second' } }, children: [] },
                ],
            },
        ]);
    });

    it('rejects visible text nodes', () => {
        expect(() => parseXML('<longlink>  Hello, ${user.name}  </longlink>')).toThrow(
            'Literal text is not supported in XML; use value attributes or nested components instead'
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
