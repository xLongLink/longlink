// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { RadioList, RadioListItem } from '@/components/custom/RadioList';

it('allows an unanswered optional group and removes a locally selected answer on reset', async () => {
    const user = userEvent.setup();

    await withMounted(
        <form>
            <RadioList label="Plan" name="plan">
                <RadioListItem label="Solo" value="solo" />
                <RadioListItem label="Team" value="team" />
            </RadioList>
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const radio = output.querySelector<HTMLElement>('[role="radio"]');

            if (!form || !radio) throw new Error('Expected optional choices');
            expect(form.checkValidity()).toBe(true);
            expect(new FormData(form).has('plan')).toBe(false);
            await act(async () => user.tab());
            expect(document.activeElement).toBe(radio);
            await act(async () => user.keyboard(' '));
            expect(new FormData(form).getAll('plan')).toEqual(['solo']);
            await act(async () => form.reset());
            expect(radio.getAttribute('aria-checked')).toBe('false');
            expect(new FormData(form).has('plan')).toBe(false);
            expect(form.checkValidity()).toBe(true);
        }
    );
});

it('blocks missing required answers and submits the choice activated through its description', async () => {
    const user = userEvent.setup();
    const submissions: FormData[] = [];

    await withMounted(
        <form
            onSubmit={(event) => {
                event.preventDefault();
                submissions.push(new FormData(event.currentTarget));
            }}
        >
            <RadioList label="Plan" description="Choose your plan" name="plan" required>
                <RadioListItem label="Solo" description="For one person" value="solo" />
                <RadioListItem label="Team" value="team" />
            </RadioList>
            <button type="submit">Save</button>
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const radio = output.querySelector<HTMLElement>('[role="radio"]');
            const submit = output.querySelector<HTMLButtonElement>('[type="submit"]');

            if (!form || !radio || !submit) throw new Error('Expected a radio form');
            expect(form.checkValidity()).toBe(false);
            await act(async () => user.click(submit));
            expect(submissions).toEqual([]);

            const description = document.getElementById(radio.getAttribute('aria-describedby') ?? '');

            if (!description) throw new Error('Expected an option description');
            await act(async () => user.click(description));
            expect(radio.getAttribute('aria-checked')).toBe('true');
            expect(document.getElementById(radio.getAttribute('aria-labelledby') ?? '')?.textContent).toBe('Solo');
            expect(form.checkValidity()).toBe(true);
            await act(async () => user.click(submit));
            expect(submissions).toHaveLength(1);
            expect(submissions[0]?.getAll('plan')).toEqual(['solo']);
            await act(async () => form.reset());
            expect(new FormData(form).has('plan')).toBe(false);
            expect(form.checkValidity()).toBe(false);
        }
    );
});

it.each(['vertical', 'horizontal'] as const)(
    'supports %s keyboard selection, skips disabled items, and restores local defaults',
    async (orientation) => {
        const user = userEvent.setup();
        const changes: string[] = [];

        await withMounted(
            <form>
                <RadioList
                    label="Plan"
                    name="plan"
                    defaultValue="solo"
                    orientation={orientation}
                    onChange={(value) => changes.push(value)}
                >
                    <RadioListItem label="Solo" value="solo" />
                    <RadioListItem label="Unavailable" value="locked" isDisabled />
                    <RadioListItem label="Team" value="team" />
                </RadioList>
            </form>,
            async (output) => {
                const form = output.querySelector('form');
                const radios = output.querySelectorAll<HTMLElement>('[role="radio"]');

                if (!form || !radios[0] || !radios[2]) throw new Error('Expected radio choices');
                await act(async () => user.tab());
                expect(document.activeElement).toBe(radios[0]);
                await act(async () => user.keyboard(orientation === 'vertical' ? '{ArrowDown}' : '{ArrowRight}'));
                expect(document.activeElement).toBe(radios[2]);
                expect(new FormData(form).getAll('plan')).toEqual(['team']);
                expect(changes).toEqual(['team']);
                form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
                await act(async () => form.reset());
                // Happy DOM resets native inputs before dispatching even canceled reset events.
                expect(radios[2].getAttribute('aria-checked')).toBe('true');
                await act(async () => form.reset());
                expect(radios[0].getAttribute('aria-checked')).toBe('true');
                expect(new FormData(form).getAll('plan')).toEqual(['solo']);
                expect(changes).toEqual(['team']);
                await act(async () => user.keyboard(' '));
                expect(new FormData(form).getAll('plan')).toEqual(['team']);
            }
        );
    }
);

it.each(['solo', undefined])('preserves controlled %s answers through rejected edits and reset', async (value) => {
    const user = userEvent.setup();
    const changes: string[] = [];

    await withMounted(
        <form>
            <RadioList
                label="Plan"
                name="plan"
                value={value}
                defaultValue="solo"
                onChange={(next) => changes.push(next)}
            >
                <RadioListItem label="Solo" value="solo" />
                <RadioListItem label="Team" value="team" />
            </RadioList>
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const radios = output.querySelectorAll<HTMLElement>('[role="radio"]');

            if (!form || !radios[1]) throw new Error('Expected a controlled radio form');
            await act(async () => user.click(radios[1]));
            expect(changes).toEqual(['team']);
            expect(radios[1].getAttribute('aria-checked')).toBe('false');
            expect(new FormData(form).getAll('plan')).toEqual(value ? [value] : []);
            await act(async () => form.reset());
            expect(new FormData(form).getAll('plan')).toEqual(value ? [value] : []);
            expect(radios[1].getAttribute('aria-checked')).toBe('false');
        }
    );
});

it('keeps a disabled group focusable but immutable, optional, and omitted from submission', async () => {
    const user = userEvent.setup();
    const changes: string[] = [];

    await withMounted(
        <form>
            <RadioList
                label="Locked"
                name="locked"
                disabled
                required
                defaultValue="solo"
                onChange={(value) => changes.push(value)}
            >
                <RadioListItem label="Solo" description="Saved answer" value="solo" />
                <RadioListItem label="Team" value="team" />
            </RadioList>
            <RadioList label="Missing" name="missing" disabled required>
                <RadioListItem label="Solo" value="solo" />
            </RadioList>
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const radios = output.querySelectorAll<HTMLElement>('[role="radio"]');
            const label = output.querySelector('label');

            if (!form || !radios[0] || !radios[1] || !label) throw new Error('Expected disabled choices');
            await act(async () => user.tab());
            expect(document.activeElement).toBe(radios[0]);
            await act(async () => user.keyboard('{ArrowDown} '));
            await act(async () => user.click(radios[1]));
            await act(async () => user.click(label));
            expect(radios[0].getAttribute('aria-checked')).toBe('true');
            expect(changes).toEqual([]);
            expect([...new FormData(form)]).toEqual([]);
            expect(form.checkValidity()).toBe(true);
        }
    );
});

it('omits disabled options and inherits native disabled fieldsets', async () => {
    const user = userEvent.setup();
    const changes: string[] = [];

    await withMounted(
        <form>
            <RadioList label="Retired" name="retired" defaultValue="old">
                <RadioListItem label="Old" value="old" isDisabled />
            </RadioList>
            <fieldset disabled>
                <RadioList
                    label="Inherited"
                    name="inherited"
                    required
                    defaultValue="solo"
                    onChange={(value) => changes.push(value)}
                >
                    <RadioListItem label="Solo" value="solo" />
                    <RadioListItem label="Team" value="team" />
                </RadioList>
            </fieldset>
            <button type="button">Next</button>
        </form>,
        async (output) => {
            const form = output.querySelector('form');
            const radio = output.querySelector<HTMLElement>('fieldset [role="radio"]');

            if (!form || !radio) throw new Error('Expected disabled fieldset');
            await act(async () => user.tab());
            expect(document.activeElement?.textContent).toBe('Next');
            await act(async () => user.click(radio));
            expect(changes).toEqual([]);
            expect(new FormData(form).has('retired')).toBe(false);
        }
    );
});
