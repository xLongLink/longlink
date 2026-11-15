// @vitest-environment happy-dom
import * as React from 'react';
import { transform } from 'sucrase';
import { it, expect } from 'vitest';
import { withMounted } from '../../render';
import * as components from '@/views/components';
import userEvent from '@testing-library/user-event';
import { MenuNavigationContext } from '@/components/custom/contexts';
import source from '../../../../sdk/longlink/.static/new/src/views/settings.jsx?raw';

const code = transform(source, {
    transforms: ['jsx', 'imports'],
    jsxRuntime: 'classic',
    jsxPragma: '__jsx',
    production: true
}).code;

const bindings = { ...components, __jsx: React.createElement, useState: React.useState };

const module = { exports: {} };

// oxlint-disable-next-line typescript/no-implied-eval -- Evaluate the repository-owned starter View with explicit runtime bindings.
const evaluate = new Function('module', 'exports', ...Object.keys(bindings), `${code}\nreturn module.exports.default;`);

// SAFETY: The repository-owned settings module exports a React component as its default.
const Settings = evaluate(module, module.exports, ...Object.values(bindings)) as React.ComponentType;

it('keeps the approval threshold coupled to the labeled preference in the shipped settings View', async () => {
    const user = userEvent.setup();

    await withMounted(
        <MenuNavigationContext value={{ hash: '#approvals', select: () => {} }}>
            <Settings />
        </MenuNavigationContext>,
        async (output) => {
            const label = output.querySelector<HTMLLabelElement>('label[for="approval-required"]');
            const control = output.querySelector('[role="switch"]');
            const threshold = output.querySelector<HTMLInputElement>('#approval-threshold');

            if (!label || !control || !threshold) throw new Error('Expected approval preference and threshold');
            expect(threshold.disabled).toBe(false);
            await React.act(async () => user.clear(threshold));
            await React.act(async () => user.type(threshold, '2500'));
            await React.act(async () => user.click(label));
            expect(control.getAttribute('aria-checked')).toBe('false');
            expect(threshold.disabled).toBe(true);
            await React.act(async () => user.click(label));
            expect(control.getAttribute('aria-checked')).toBe('true');
            expect(threshold.disabled).toBe(false);
            expect(threshold.value).toBe('2500');
        }
    );
});
