// @vitest-environment happy-dom
import * as React from 'react';
import { transform } from 'sucrase';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../../../render';
import * as components from '@/components/longlink';
import userEvent from '@testing-library/user-event';
import { RequestContext } from '@/lib/view-capabilities';
import UseConfirmPage from '@/platform/routes/docs/sdk/views/use-confirm';

it('runs the documented deletion and replaces the action with a return link after success', async () => {
    // Arrange
    const source: unknown = UseConfirmPage().props.children.props.code;
    if (typeof source !== 'string') throw new Error('Expected the confirmation example source');
    const code = transform(source, {
        transforms: ['jsx', 'imports'],
        jsxRuntime: 'classic',
        jsxPragma: '__jsx',
        jsxFragmentPragma: '__fragment',
        production: true
    }).code;
    const bindings = { __jsx: React.createElement, __fragment: React.Fragment, ...components };
    const module = { exports: {} };
    // oxlint-disable-next-line typescript/no-implied-eval -- Execute the published example with real View bindings.
    const evaluate = new Function(
        'module',
        'exports',
        ...Object.keys(bindings),
        `${code}\nreturn module.exports.default;`
    );
    const DeleteItem = evaluate(module, module.exports, ...Object.values(bindings)) as React.ComponentType<{
        params: { item: string };
    }>;
    const request = vi.fn(async () => null);
    const user = userEvent.setup();

    await withMounted(
        <RequestContext value={request}>
            <DeleteItem params={{ item: '42' }} />
        </RequestContext>,
        async (output) => {
            const trigger = output.querySelector('button');
            if (!trigger) throw new Error('Expected the delete action');

            // Act
            await React.act(async () => user.click(trigger));
            const dialog = document.querySelector('[role="alertdialog"]');
            const confirm = Array.from(dialog?.querySelectorAll('button') ?? []).find(
                (button) => button.textContent === 'Delete'
            );
            if (!confirm) throw new Error('Expected the confirmation action');
            await React.act(async () => user.click(confirm));

            // Assert
            expect(request).toHaveBeenCalledWith('/api/items/42', expect.objectContaining({ method: 'DELETE' }));
            expect(output.querySelector('a')?.textContent).toBe('Back to items');
            expect(output.querySelector('a')?.getAttribute('href')).toBe('/items');
            expect(output.querySelector('button')).toBeNull();
            expect(document.querySelector('[role="alertdialog"]')).toBeNull();
        }
    );
});
