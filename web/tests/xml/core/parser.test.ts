import { parseFragment } from '../helpers';
import { parseXML } from '@/xml/core/parser';
import { describe, expect, it } from 'vitest';

describe('parseXML', () => {
    it('compiles literal attribute params', () => {
        expect(parseFragment('<Button isDisabled="false" count="5" />')).toEqual([
            {
                key: '1',
                name: 'Button',
                params: {
                    count: { kind: 'text', value: '5' },
                    isDisabled: { kind: 'text', value: 'false' },
                },
                children: [],
            },
        ]);
    });

    it('parses view structure', () => {
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
        ).toEqual({
            key: '0',
            name: 'longlink',
            params: {},
            children: [
                {
                    key: '1',
                    name: 'Button',
                    params: {},
                    children: [
                        { key: '2', name: '$text', params: { value: { kind: 'text', value: 'Save' } }, children: [] },
                    ],
                },
                { key: '3', name: 'State', params: { id: { kind: 'text', value: 'first' } }, children: [] },
                { key: '4', name: 'State', params: { id: { kind: 'text', value: 'second' } }, children: [] },
            ],
        });
    });

    it('compiles visible text nodes as Text components', () => {
        expect(parseFragment('<Heading level="1">  Hello, world  </Heading>')).toEqual([
            {
                key: '1',
                name: 'Heading',
                params: { level: { kind: 'text', value: '1' } },
                children: [
                    {
                        key: '2',
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

    it('rejects an empty document', () => {
        expect(() => parseXML('')).toThrow('XML is invalid');
    });

    it.each(['<longlink /><longlink />', '<Button />'])('rejects a document without one longlink root: %s', (xml) => {
        expect(() => parseXML(xml)).toThrow('XML views must contain exactly one longlink root');
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
