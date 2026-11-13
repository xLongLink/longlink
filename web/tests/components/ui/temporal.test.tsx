// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import { withMounted } from '../../render';
import { Form } from '@/components/ui/Form';
import userEvent from '@testing-library/user-event';
import { DateInput } from '@/components/ui/DateInput';
import { TimeInput } from '@/components/ui/TimeInput';
import { act, useState, type FormEvent } from 'react';
import type { ISODateString, ISOTimeString } from '@/components/ui/temporal';

/** Requires a mounted control before exercising its real DOM behavior. */
function find<T extends Element>(root: ParentNode, selector: string) {
    const element = root.querySelector<T>(selector);

    if (!element) throw new Error(`Missing control: ${selector}`);

    return element;
}

/** Supplies canonical fixtures independently of production factories. */
function time(value: string) {
    // SAFETY: All call sites supply independently specified canonical HH:mm[:ss] literals.
    return value as ISOTimeString;
}

it.each(['date', 'time'] as const)(
    'opens the coarse-pointer %s sheet from its read-only field without submitting',
    async (kind) => {
        const matchMedia = window.matchMedia.bind(window);

        const media = vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
            const result = matchMedia(query);

            if (query === '(pointer: coarse)') Object.defineProperty(result, 'matches', { value: true });

            return result;
        });

        const submissions = vi.fn((event: FormEvent) => event.preventDefault());
        const user = userEvent.setup();

        try {
            await withMounted(
                <form onSubmit={submissions}>
                    {kind === 'date' ? <DateInput label="When" name="when" /> : <TimeInput label="When" name="when" />}
                    <button type="submit">Submit</button>
                </form>,
                async (output) => {
                    const input = find<HTMLInputElement>(output, 'input:not([type=hidden])');
                    expect(input.readOnly).toBe(true);
                    await act(async () => user.click(input));
                    expect(document.querySelector('[role=dialog]')).not.toBeNull();
                    await act(async () => user.click(find(document, '.view-temporal-close')));
                    await vi.waitFor(() => expect(document.activeElement).toBe(input));
                    await act(async () => user.keyboard('{Enter}'));
                    expect(document.querySelector('[role=dialog]')).not.toBeNull();
                    expect(submissions).not.toHaveBeenCalled();
                    expect(new FormData(find<HTMLFormElement>(output, 'form')).get('when')).toBe('');
                }
            );
        } finally {
            media.mockRestore();
        }
    }
);

/** Chooses a themed picker option through its label and real portalled list. */
async function choose(user: ReturnType<typeof userEvent.setup>, root: ParentNode, label: string, value: string) {
    const field = [...root.querySelectorAll('label')].find((element) => element.textContent === label);
    const control = field?.control;

    if (!control) throw new Error(`Missing picker: ${label}`);
    await act(async () => user.click(control));

    const option = [...document.querySelectorAll<HTMLElement>('[role=listbox] [role=option]')].find(
        (element) => !element.closest('[data-closed]') && element.textContent === value
    );

    if (!option) throw new Error(`Missing option: ${value}`);
    await act(async () => user.click(option));

    return control;
}

it('rejects nonexistent and forbidden dates without submitting a stale saved date, then recovers at inclusive bounds', async () => {
    // A previously saved date must not hide a malformed or forbidden edited date.
    const submissions: FormData[] = [];
    const changes: (ISODateString | undefined)[] = [];
    const user = userEvent.setup();
    await withMounted(
        <Form
            action={(data) => {
                submissions.push(data);
            }}
        >
            <DateInput
                label="Due"
                name="due"
                defaultValue="2028-02-28"
                min="2028-02-28"
                max="2028-03-02"
                dateConstraints={[(date) => date.getDate() !== 1]}
                onChange={(value) => changes.push(value)}
                required
            />
        </Form>,
        async (output) => {
            const input = find<HTMLInputElement>(output, 'input:not([type=hidden])');
            const form = find<HTMLFormElement>(output, 'form');

            for (const text of ['2028-02-30', '2028-02-27', 'March 1, 2028', '2028-03-03']) {
                await act(async () => {
                    await user.clear(input);
                    await user.type(input, text);
                });
                await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
                expect(submissions).toHaveLength(0);
                expect(input.getAttribute('aria-invalid')).toBe('true');
            }

            for (const text of ['February 28, 2028', '29/2/2028', 'March 2, 2028']) {
                await act(async () => {
                    await user.clear(input);
                    await user.type(input, text);
                });
                await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
            }

            expect(submissions.map((data) => data.getAll('due'))).toEqual([
                ['2028-02-28'],
                ['2028-02-29'],
                ['2028-03-02'],
            ]);
            expect(changes).toEqual(['2028-02-29', '2028-03-02']);
            expect(output.querySelector('[role=alert]')).toBeNull();
            expect(input.name).toBe('');
        }
    );
});

it('canonicalizes typed AM/PM and compact time, validates seconds inclusively, and recovers after a malformed draft', async () => {
    // Comparing time bounds lexically would reject the same minute with explicit zero seconds.
    const submissions: FormData[] = [];
    const user = userEvent.setup();
    await withMounted(
        <Form
            action={(data) => {
                submissions.push(data);
            }}
        >
            <TimeInput label="Start" name="start" hasSeconds min={time('09:30')} max={time('14:30:15')} required />
        </Form>,
        async (output) => {
            const input = find<HTMLInputElement>(output, 'input:not([type=hidden])');
            const form = find<HTMLFormElement>(output, 'form');

            for (const text of ['09:29:59', '14:30:16', '13:30 PM', '09:60', 'not a time']) {
                await act(async () => {
                    await user.clear(input);
                    await user.type(input, text);
                });
                await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
                expect(submissions).toHaveLength(0);
            }

            for (const text of ['9:30 AM', '143015']) {
                await act(async () => {
                    await user.clear(input);
                    await user.type(input, text);
                });
                await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
            }

            expect(submissions.map((data) => data.getAll('start'))).toEqual([['09:30:00'], ['14:30:15']]);
            expect(input.value).toBe('2:30:15 PM');
            expect(input.name).toBe('');
            await act(async () => user.clear(input));
            await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
            expect(submissions).toHaveLength(2);
            expect(output.querySelector('[role=alert]')?.textContent).toBe('Please complete this field.');
        }
    );
});

it('keeps minute increments independent of second precision and refuses steps outside bounds', async () => {
    // Stepping an active draft must replace it, not allow blur to overwrite the stepped value.
    const changes: (ISOTimeString | undefined)[] = [];
    const user = userEvent.setup();
    await withMounted(
        <form>
            <TimeInput
                label="Start"
                name="start"
                defaultValue={time('12:00:17')}
                min={time('12:00:17')}
                max={time('12:10:17')}
                hasSeconds
                hourFormat="24h"
                increment={5}
                onChange={(value) => changes.push(value)}
            />
        </form>,
        async (output) => {
            const input = find<HTMLInputElement>(output, 'input:not([type=hidden])');
            await act(async () => {
                await user.clear(input);
                await user.type(input, 'broken');
                await user.keyboard('{ArrowDown}{ArrowUp}{ArrowUp}{ArrowUp}');
            });
            expect(changes).toEqual(['12:05:17', '12:10:17']);
            expect(input.value).toBe('12:10:17');
            await act(async () => user.tab());
            expect(new FormData(find<HTMLFormElement>(output, 'form')).getAll('start')).toEqual(['12:10:17']);
        }
    );
});

it('restores caller-owned values after rejected commits and clear requests without submitting display text', async () => {
    // Neither a valid draft nor clear may take ownership from a controlled caller that rejects changes.
    const changes: (string | undefined)[] = [];
    const user = userEvent.setup();
    await withMounted(
        <form>
            <DateInput label="Due" name="due" value="2028-02-29" onChange={(value) => changes.push(value)} />
            <TimeInput label="Start" name="start" value={time('09:30')} onChange={(value) => changes.push(value)} />
        </form>,
        async (output) => {
            const [date, time] = [...output.querySelectorAll<HTMLInputElement>('input:not([type=hidden])')];
            await act(async () => {
                await user.clear(date);
                await user.type(date, 'March 1, 2028');
                await user.tab();
            });
            expect(date.value).toBe('February 29, 2028');
            await act(async () => {
                await user.clear(time);
                await user.paste('2pm');
                await user.tab();
            });
            expect(time.value).toBe('9:30 AM');

            for (const label of ['Clear Due', 'Clear Start']) {
                const clear = find<HTMLButtonElement>(output, `button[aria-label="${label}"]`);
                await act(async () => user.click(clear));
            }

            expect(changes).toEqual(['2028-03-01', '2028-03-01', '14:00', '14:00', undefined, undefined]);
            expect(new FormData(find<HTMLFormElement>(output, 'form')).getAll('due')).toEqual(['2028-02-29']);
            expect(new FormData(find<HTMLFormElement>(output, 'form')).getAll('start')).toEqual(['09:30']);
            expect(document.activeElement).toBe(time);
        }
    );
});

it('abandons malformed drafts only after an accepted reset and clears optional values with focus restoration', async () => {
    // Reset must reset the editable buffer even when the underlying canonical value never changed.
    const user = userEvent.setup();
    await withMounted(
        <form>
            <DateInput label="Due" name="due" defaultValue="2028-02-29" />
            <TimeInput label="Start" name="start" defaultValue={time('14:30:15')} hasSeconds />
        </form>,
        async (output) => {
            const form = find<HTMLFormElement>(output, 'form');
            const [date, time] = [...output.querySelectorAll<HTMLInputElement>('input:not([type=hidden])')];
            await act(async () => {
                await user.clear(date);
                await user.type(date, 'broken');
                await user.clear(time);
                await user.type(time, 'broken');
            });
            form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
            await act(async () => form.reset());
            expect(date.value).toBe('broken');
            expect(time.value).toBe('broken');
            await act(async () => form.reset());
            expect(date.value).toBe('February 29, 2028');
            expect(time.value).toBe('2:30:15 PM');
            await act(async () => user.click(find<HTMLButtonElement>(output, 'button[aria-label="Clear Due"]')));
            expect(date.value).toBe('');
            expect(document.activeElement).toBe(date);
            expect(new FormData(form).getAll('due')).toEqual(['']);
        }
    );
});

it('keeps disabled controls focusable while preventing edits, opening and named submission', async () => {
    // Disabled is a discoverable state, not permission to submit a hidden saved value.
    const changes: (string | undefined)[] = [];
    const user = userEvent.setup();
    await withMounted(
        <form>
            <DateInput
                label="Due"
                name="due"
                defaultValue="2028-02-29"
                disabled
                onChange={(value) => changes.push(value)}
            />
            <TimeInput
                label="Start"
                name="start"
                defaultValue={time('14:30')}
                disabled
                onChange={(value) => changes.push(value)}
            />
        </form>,
        async (output) => {
            const controls = [
                ...output.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input:not([type=hidden]),button'),
            ];

            for (const control of controls) {
                await act(async () => control.focus());
                expect(document.activeElement).toBe(control);
                await act(async () => user.keyboard('5{ArrowUp}{Enter}'));
                expect(document.querySelector('[role=dialog]')).toBeNull();
            }

            expect(changes).toEqual([]);
            expect([...new FormData(find<HTMLFormElement>(output, 'form')).entries()]).toEqual([]);
        }
    );
});

it('lets a calendar keyboard selection honor disabled constraints and restores focus on Escape', async () => {
    // Calendar navigation and selection must use the same constraints as typed submission.
    const user = userEvent.setup();
    await withMounted(
        <form>
            <DateInput
                label="Due"
                name="due"
                defaultValue="2028-02-28"
                min="2028-02-01"
                max="2028-02-29"
                dateConstraints={[(date) => date.getDate() !== 29]}
            />
        </form>,
        async (output) => {
            const input = find<HTMLInputElement>(output, 'input:not([type=hidden])');
            await act(async () => user.click(find<HTMLButtonElement>(output, 'button[aria-label="Choose Due"]')));
            const dialog = find<HTMLElement>(document, '[role=dialog]');
            expect(dialog).not.toBeNull();
            expect(find<HTMLButtonElement>(dialog, '.rdp-button_next').getAttribute('aria-disabled')).toBe('true');
            const forbidden = find<HTMLButtonElement>(dialog, 'button[aria-label*="February 29"]');
            expect(forbidden.disabled).toBe(true);
            const day = find<HTMLButtonElement>(dialog, 'button[aria-label*="February 28"]');
            expect(document.activeElement).toBe(day);
            await act(async () => {
                await user.keyboard('{ArrowLeft}{Enter}');
            });
            expect(new FormData(find<HTMLFormElement>(output, 'form')).get('due')).toBe('2028-02-27');
            expect(document.querySelector('[role=dialog]')).toBeNull();
            expect(document.activeElement).toBe(input);
            await act(async () => user.keyboard('{ArrowDown}'));
            expect(document.querySelector('[role=dialog]')).not.toBeNull();
            await act(async () => user.keyboard('{Escape}'));
            expect(document.querySelector('[role=dialog]')).toBeNull();
            expect(document.activeElement).toBe(input);
        }
    );
});

it('commits time columns live, clamps bounds, and retains column focus without applying changes on Save', async () => {
    // A selected column is a live edit; saving must only close the sheet.
    const changes: (ISOTimeString | undefined)[] = [];

    function Example() {
        const [value, setValue] = useState<ISOTimeString | undefined>(time('09:30:15'));

        return (
            <form>
                <TimeInput
                    label="Start"
                    name="start"
                    value={value}
                    onChange={(next) => {
                        changes.push(next);
                        setValue(next);
                    }}
                    hasSeconds
                    hourFormat="24h"
                    increment={5}
                    min={time('09:00')}
                    max={time('10:00')}
                />
            </form>
        );
    }

    const user = userEvent.setup();
    await withMounted(<Example />, async (output) => {
        await act(async () => user.click(find<HTMLButtonElement>(output, 'button[aria-label="Choose Start"]')));
        const dialog = find<HTMLElement>(document, '[role=dialog]');
        const hour = await choose(user, dialog, 'Hour', '11');
        expect(document.activeElement).toBe(hour);
        expect(new FormData(find<HTMLFormElement>(output, 'form')).get('start')).toBe('10:00:00');
        expect(document.querySelector('[role=dialog]')).toBe(dialog);
        await choose(user, dialog, 'Hour', '09');
        await choose(user, dialog, 'Minute', '07');
        await choose(user, dialog, 'Second', '30');
        expect(new FormData(find<HTMLFormElement>(output, 'form')).getAll('start')).toEqual(['09:07:30']);
        expect(find<HTMLInputElement>(output, 'input:not([type=hidden])').value).toBe('09:07:30');
        expect(changes).toEqual(['10:00:00', '09:00:00', '09:07:00', '09:07:30']);
        await act(async () => user.click(find<HTMLButtonElement>(dialog, '.view-temporal-close')));
        expect(changes).toEqual(['10:00:00', '09:00:00', '09:07:00', '09:07:30']);
        expect(document.querySelector('[role=dialog]')).toBeNull();
        expect(document.activeElement).toBe(find<HTMLInputElement>(output, 'input:not([type=hidden])'));
    });
});

it('dismisses a desktop calendar when another field is clicked without stealing that field focus', async () => {
    // An outside click must both close the calendar and leave the clicked control usable.
    const user = userEvent.setup();
    await withMounted(
        <form>
            <DateInput label="Due" name="due" defaultValue="2028-02-28" />
            <label>
                Notes
                <input aria-label="Notes" />
            </label>
        </form>,
        async (output) => {
            await act(async () => user.click(find<HTMLButtonElement>(output, 'button[aria-label="Choose Due"]')));
            expect(document.querySelector('[role=dialog]')).not.toBeNull();
            const notes = find<HTMLInputElement>(output, 'input[aria-label=Notes]');
            await act(async () => user.click(notes));
            expect(document.querySelector('[role=dialog]')).toBeNull();
            expect(document.activeElement).toBe(notes);
            await act(async () => user.keyboard('keep this focus'));
            expect(notes.value).toBe('keep this focus');
            expect(new FormData(find<HTMLFormElement>(output, 'form')).get('due')).toBe('2028-02-28');
        }
    );
});

it('refuses portalled calendar changes after the owning fieldset is disabled and still permits dismissal', async () => {
    // Portals escape native disabled inheritance; the owning field must remain authoritative.
    const user = userEvent.setup();
    const changes: (ISODateString | undefined)[] = [];
    await withMounted(
        <form>
            <fieldset>
                <DateInput label="Due" name="due" defaultValue="2028-02-28" onChange={(value) => changes.push(value)} />
            </fieldset>
        </form>,
        async (output) => {
            const fieldset = find<HTMLFieldSetElement>(output, 'fieldset');
            const trigger = find<HTMLButtonElement>(output, 'button[aria-label="Choose Due"]');
            await act(async () => user.click(trigger));
            const dialog = find<HTMLElement>(document, '[role=dialog]');
            await act(async () => {
                fieldset.disabled = true;
            });
            await act(async () => user.click(find<HTMLButtonElement>(dialog, 'button[aria-label*="February 27"]')));
            expect(changes).toEqual([]);
            expect(find<HTMLInputElement>(output, 'input[type=hidden]').value).toBe('2028-02-28');
            await act(async () => user.keyboard('{Escape}'));
            expect(document.querySelector('[role=dialog]')).toBeNull();
            await act(async () => user.click(trigger));
            expect(document.querySelector('[role=dialog]')).toBeNull();
            await act(async () => {
                fieldset.disabled = false;
            });
            expect(new FormData(find<HTMLFormElement>(output, 'form')).get('due')).toBe('2028-02-28');
        }
    );
});

it('refuses open time column changes after the owning input is disabled without trapping Save', async () => {
    // An enabled portal column must not bypass a newly disabled native owner.
    const user = userEvent.setup();
    const changes: (ISOTimeString | undefined)[] = [];
    await withMounted(
        <form>
            <TimeInput
                label="Start"
                name="start"
                defaultValue={time('09:30')}
                onChange={(value) => changes.push(value)}
            />
        </form>,
        async (output) => {
            const input = find<HTMLInputElement>(output, 'input:not([type=hidden])');
            await act(async () => user.click(find<HTMLButtonElement>(output, 'button[aria-label="Choose Start"]')));
            const dialog = find<HTMLElement>(document, '[role=dialog]');
            await act(async () => {
                input.disabled = true;
            });
            await choose(user, dialog, 'Minute', '31');
            expect(changes).toEqual([]);
            expect(find<HTMLInputElement>(output, 'input[type=hidden]').value).toBe('09:30');
            await act(async () => user.click(find<HTMLButtonElement>(dialog, '.view-temporal-close')));
            expect(document.querySelector('[role=dialog]')).toBeNull();
            expect(new FormData(find<HTMLFormElement>(output, 'form')).get('start')).toBe('09:30');
        }
    );
});

it('keeps rejected time columns caller-owned and does not commit a fallback when an empty picker is saved', async () => {
    // Rejected live edits and an untouched fallback must never become accepted submission values.
    const user = userEvent.setup();
    const changes: (ISOTimeString | undefined)[] = [];
    await withMounted(
        <form>
            <TimeInput label="Start" name="start" value={time('09:30')} onChange={(value) => changes.push(value)} />
            <TimeInput label="Empty" name="empty" value={undefined} onChange={(value) => changes.push(value)} />
        </form>,
        async (output) => {
            await act(async () => user.click(find<HTMLButtonElement>(output, 'button[aria-label="Choose Start"]')));
            const dialog = find<HTMLElement>(document, '[role=dialog]');
            const minute = await choose(user, dialog, 'Minute', '31');
            expect(changes).toEqual(['09:31']);
            expect(minute.textContent).toBe('30');
            expect(new FormData(find<HTMLFormElement>(output, 'form')).get('start')).toBe('09:30');
            await act(async () => user.click(find<HTMLButtonElement>(dialog, '.view-temporal-close')));
            await act(async () => user.click(find<HTMLButtonElement>(output, 'button[aria-label="Choose Empty"]')));
            const empty = find<HTMLElement>(document, '[role=dialog]');
            await act(async () => user.click(find<HTMLButtonElement>(empty, '.view-temporal-close')));
            expect(changes).toEqual(['09:31']);
            expect(new FormData(find<HTMLFormElement>(output, 'form')).getAll('empty')).toEqual(['']);
        }
    );
});

it('submits ASCII ISO times after typing Unicode digits, RTL marks, and spaced separators', async () => {
    // Locale-formatted pasted clocks must not become invalid or leak display glyphs into submission.
    const user = userEvent.setup();
    const submissions: FormData[] = [];
    await withMounted(
        <Form
            action={(data) => {
                submissions.push(data);
            }}
        >
            <TimeInput label="Start" name="start" required />
        </Form>,
        async (output) => {
            const input = find<HTMLInputElement>(output, 'input:not([type=hidden])');
            const form = find<HTMLFormElement>(output, 'form');

            for (const text of ['١٢:٣٠', '\u200f٣:\u200f٣٠ PM', '１２\u00a0:\u00a0３０ PM']) {
                await act(async () => {
                    await user.clear(input);
                    await user.paste(text);
                });
                await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
            }

            expect(submissions.map((data) => data.getAll('start'))).toEqual([['12:30'], ['15:30'], ['12:30']]);
        }
    );
});
