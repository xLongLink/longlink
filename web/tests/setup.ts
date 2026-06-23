import { mock } from 'bun:test';

// Provide the minimal Monaco surface that the window component touches in tests.
mock.module('monaco-editor', () => ({
    editor: {
        create() {
            return {
                getModel() {
                    return null;
                },
                getValue() {
                    return '';
                },
                setValue() {},
                dispose() {},
            };
        },
    },
}));

// Bun test does not understand Vite's `?worker` import, so we replace the Monaco worker with a stub.
mock.module('monaco-editor/esm/vs/editor/editor.worker?worker', () => ({
    default: class EditorWorkerStub {
        constructor() {}
    },
}));

// The XML language contribution is also only needed in the browser bundle.
mock.module('monaco-editor/esm/vs/basic-languages/xml/xml.contribution', () => ({}));
