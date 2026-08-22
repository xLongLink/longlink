import { parseXML } from '@/xml/core/parser';
import { describe, expect, it } from 'vitest';

describe('parseXML', () => {
    it('compiles literal attribute params', () => {
        expect(parseXML('<Button isDisabled="false" count="5" />')).toEqual([
            {
                name: 'Button',
                params: {
                    count: { kind: 'text', value: '5' },
                    isDisabled: { kind: 'text', value: 'false' },
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
                    <Button>Save</Button>
                    <State id="first" />
                    <State id="second" />
                </longlink>`
            )
        ).toEqual([
            {
                name: 'longlink',
                params: {},
                children: [
                    {
                        name: 'Button',
                        params: {},
                        children: [{ name: '$text', params: { value: { kind: 'text', value: 'Save' } }, children: [] }],
                    },
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
                        name: '$text',
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

    it.each([
        '<!DOCTYPE longlink><longlink />',
        '<!ENTITY hidden "value"><longlink />',
        '<longlink><![CDATA[hidden]]></longlink>',
    ])('rejects unsupported XML construct: %s', (xml) => {
        expect(() => parseXML(xml)).toThrow('XML DOCTYPE, ENTITY, and CDATA constructs are not supported');
    });

    it.each([
        ['className', 'className is not supported in XML'],
        ['onClick', 'Event handler attribute "onClick" is not supported in XML'],
    ])('rejects unsupported XML attribute: %s', (name, expected) => {
        expect(() => parseXML(`<Button ${name}="value" />`)).toThrow(expected);
    });
});
