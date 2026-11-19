// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { act, useState } from 'react';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { Switch } from '@/components/longlink/form/switch';
import { Checkbox } from '@/components/longlink/form/checkbox';

it.each([
    ['switch', Switch],
    ['checkbox', Checkbox]
] as const)('%s accepts the native checked callback and excludes disabled values', async (role, Control) => {
    const user = userEvent.setup();

    function Preferences() {
        const [checked, setChecked] = useState(false);

        return (
            <form>
                <Control aria-label="Enabled" name="enabled" checked={checked} onCheckedChange={setChecked} />
                <Control aria-label="Locked" name="locked" defaultChecked disabled />
                <button type="submit">Save</button>
            </form>
        );
    }

    await withMounted(<Preferences />, async (output) => {
        const form = output.querySelector('form');
        const control = output.querySelector<HTMLElement>(`[role="${role}"]`);
        const submit = output.querySelector('button[type="submit"]');

        if (!form || !control || !submit) throw new Error('Expected native boolean controls');
        expect(new FormData(form).has('enabled')).toBe(false);
        await act(async () => user.tab());
        expect(document.activeElement).toBe(control);
        await act(async () => user.keyboard(' '));
        expect(control.getAttribute('aria-checked')).toBe('true');
        expect([...new FormData(form)]).toEqual([['enabled', 'on']]);
        await act(async () => user.tab());
        expect(document.activeElement).toBe(submit);
    });
});
