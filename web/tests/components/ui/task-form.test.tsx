// @vitest-environment happy-dom
import * as React from 'react';
import { transform } from 'sucrase';
import { it, expect } from 'vitest';
import * as components from '@/views';
import { withMounted } from '../../render';
import { ReportedError } from '@/lib/reported';
import userEvent from '@testing-library/user-event';
import { RequestContext } from '@/lib/view-capabilities';
import source from '../../../../sdk/longlink/.static/new/src/views/tasks.jsx?raw';

const code = transform(source, {
    transforms: ['jsx', 'imports'],
    jsxRuntime: 'classic',
    jsxPragma: '__jsx',
    production: true
}).code;

const bindings = { __jsx: React.createElement, ...components, useApi: () => [[]] };

const module = { exports: {} };

// oxlint-disable-next-line typescript/no-implied-eval -- Exercise the shipped SDK View with its explicit runtime bindings.
const evaluate = new Function('module', 'exports', ...Object.keys(bindings), `${code}\nreturn module.exports.default;`);

// SAFETY: The evaluated module is the repository-owned starter View and has a default React component.
const Tasks = evaluate(module, module.exports, ...Object.values(bindings)) as React.ComponentType;

it('validates the shipped task form, retains the file and draft on failure, and closes only after a successful retry', async () => {
    // Replace only the scoped transport, leaving the authored View, RHF, file control, and dialog real.
    const user = userEvent.setup();
    const file = new File(['invoice'], 'invoice.pdf', { type: 'application/pdf' });
    const writes: [string, string | Blob][][] = [];

    await withMounted(
        <RequestContext
            value={async (path, options) => {
                if (!options?.form) throw new Error('Expected a write request');
                expect(path).toBe('/api/tasks');
                expect(options.method).toBe('POST');
                writes.push(options.form);

                if (writes.length === 1) throw new ReportedError('Unavailable');

                return null;
            }}
        >
            <Tasks />
        </RequestContext>,
        async (output) => {
            const add = [...output.querySelectorAll('button')].find((button) =>
                button.textContent?.includes('Add task')
            );

            if (!add) throw new Error('Expected the task action');
            await React.act(async () => user.click(add));

            const form = document.querySelector('form');
            const title = document.querySelector<HTMLInputElement>('input[name="title"]');
            const upload = document.querySelector<HTMLInputElement>('input[type="file"]');

            if (!form || !title || !upload) throw new Error('Expected the task dialog form');

            await React.act(async () => form.requestSubmit());
            expect(writes).toEqual([]);
            expect(document.querySelectorAll('[role="alert"]').length).toBeGreaterThan(0);

            await React.act(async () => user.type(title, 'Review invoice'));

            // Native file inputs leave size validation to the form schema before any scoped write.
            await React.act(async () => user.upload(upload, new File([new Uint8Array(10485761)], 'oversized.pdf')));
            await React.act(async () => form.requestSubmit());
            expect(writes).toEqual([]);
            expect(form.textContent).toContain('Choose a file smaller than 10 MB.');

            await React.act(async () => user.upload(upload, file));
            await React.act(async () => form.requestSubmit());
            expect(writes).toEqual([
                [
                    ['title', 'Review invoice'],
                    ['attachment', file]
                ]
            ]);
            expect(document.contains(form)).toBe(true);
            expect(title.value).toBe('Review invoice');
            expect(upload.files?.[0]).toBe(file);
            expect(form.textContent).toContain('Unavailable');

            await React.act(async () => form.requestSubmit());
            expect(writes).toEqual([
                [
                    ['title', 'Review invoice'],
                    ['attachment', file]
                ],
                [
                    ['title', 'Review invoice'],
                    ['attachment', file]
                ]
            ]);
            expect(document.querySelector('[role="dialog"]')).toBeNull();
        }
    );
});
