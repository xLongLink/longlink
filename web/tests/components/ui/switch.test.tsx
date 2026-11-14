// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { act, useState } from 'react';
import { withMounted } from '../../render';
import { Switch } from '@/components/shadcn/switch';
import userEvent from '@testing-library/user-event';
import { Checkbox } from '@/components/shadcn/checkbox';

it.each([
    ['switch', Switch],
    ['checkbox', Checkbox]
] as const)('%s accepts the native checked callback and excludes disabled values', async (role, Control) => {
    const user = userEvent.setup();

    function Preferences() {
        const [checked, setChecked] = useState(false);

        return (
            <form>
                <Control
                    aria-label="Enabled"
                    name="enabled"
                    checked={checked}
                    onCheckedChange={setChecked}
                    render={<button type="button" />}
                    nativeButton
                />
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

it('preserves native switch sizing and caller-controlled checked state', async () => {
    const user = userEvent.setup();
    const changes: boolean[] = [];

    await withMounted(
        <Switch
            aria-label="Enabled"
            size="sm"
            checked
            onCheckedChange={(checked) => changes.push(checked)}
            render={<button type="button" />}
            nativeButton
        />,
        async (output) => {
            const control = output.querySelector('[role="switch"]');

            if (!control) throw new Error('Expected a switch');
            expect(control.getAttribute('data-size')).toBe('sm');
            await act(async () => user.click(control));
            expect(changes).toEqual([false]);
            expect(control.getAttribute('aria-checked')).toBe('true');
        }
    );
});
