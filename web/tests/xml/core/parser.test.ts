import { parseFragment } from '../helpers';
import { parseXML } from '@/xml/core/parser';
import { describe, expect, it } from 'vitest';

describe('parseXML', () => {
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
        });
    });

    it('trims visible text nodes', () => {
        expect(parseFragment('<Heading level="1">  Hello, world  </Heading>')[0]?.children[0]?.params.value).toEqual({
            kind: 'text',
            value: 'Hello, world',
        });
    });

    it.each([
        { name: 'malformed tags', xml: '<longlink><Button></longlink>' },
        { name: 'an empty document', xml: '' },
    ])('rejects $name', ({ xml }) => {
        expect(() => parseXML(xml)).toThrow('XML is invalid');
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

    it('rejects uppercase event handlers inside a valid view', () => {
        // Arrange
        const xml = '<longlink><Button ONCLICK="value">Save</Button></longlink>';

        // Act and assert
        expect(() => parseXML(xml)).toThrow('Event handler attribute "ONCLICK" is not supported in XML');
    });
});
