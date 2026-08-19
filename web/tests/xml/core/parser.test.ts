import { parseXML } from '@/xml/core/parser';
import { describe, expect, it } from 'vitest';

describe('parseXML', () => {
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

    it('compiles visible text nodes as Text components', () => {
        expect(parseXML('<Heading level="1">  Hello, world  </Heading>')).toEqual([
            {
                name: 'Heading',
                params: { level: { kind: 'text', value: '1' } },
                children: [
                    {
                        name: 'Text',
                        params: { value: { kind: 'text', value: 'Hello, world' } },
                        children: [],
                    },
                ],
            },
        ]);
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

    it('rejects styling and event handler attributes on XML nodes', () => {
        const cases = [
            { name: 'className', expected: 'className is not supported in XML' },
            { name: 'onClick', expected: 'Event handler attribute "onClick" is not supported in XML' },
        ];

        for (const testCase of cases) {
            expect(() => parseXML(`<Button ${testCase.name}="value" />`)).toThrow(testCase.expected);
        }
    });
});
