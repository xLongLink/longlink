import { describe, expect, it, mock } from 'bun:test';

const xmlInputs = {
    rich: '<Page></Page>',
    attrs: '<Button />',
};

mock.module('fast-xml-parser', () => {
    return {
        XMLParser: class {
            parse(xml: string) {
                if (xml === xmlInputs.rich) {
                    return [
                        {
                            '?xml': [],
                        },
                        {
                            '#text': '   ',
                        },
                        {
                            Page: [
                                {
                                    Text: [{ '#text': 'Hello' }],
                                },
                                {
                                    '#text': ' world ',
                                },
                                {
                                    '!DOCTYPE': [],
                                },
                            ],
                        },
                    ];
                }

                if (xml === xmlInputs.attrs) {
                    return [
                        {
                            Button: [],
                            ':@': {
                                title: 'Submit',
                                valid: true,
                                'set:filter.value': "'week'",
                            },
                        },
                    ];
                }

                return [];
            }
        },
    };
});

describe('xmlToAST', () => {
    it('converts preserve-order structure into filtered AST nodes', async () => {
        const { xmlToAST } = await import('../../src/xml/compiler');
        const ast = xmlToAST(xmlInputs.rich);

        expect(ast).toEqual([
            {
                name: 'Page',
                children: [
                    {
                        name: 'Text',
                        children: [{ name: 'text', value: 'Hello' }],
                    },
                    { name: 'text', value: ' world ' },
                ],
            },
        ]);
    });

    it('keeps string attrs only and preserves namespaced-like attr names', async () => {
        const { xmlToAST } = await import('../../src/xml/compiler');
        const ast = xmlToAST(xmlInputs.attrs);

        expect(ast).toEqual([
            {
                name: 'Button',
                params: {
                    title: 'Submit',
                    'set:filter.value': "'week'",
                },
            },
        ]);
    });
});
