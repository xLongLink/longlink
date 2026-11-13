// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { FileInput, NativeFileInput } from '@/components/ui/FileInput';

/** Requires the real control used by an interaction. */
function control<T extends HTMLElement>(output: ParentNode, selector: string): T {
    const element = output.querySelector<T>(selector);

    if (!element) throw new Error(`Expected ${selector}`);

    return element;
}

/** Happy DOM does not emit the browser's formdata event when constructing FormData. */
function collect(form: HTMLFormElement) {
    const data = new FormData(form);
    form.dispatchEvent(Object.assign(new Event('formdata'), { formData: data }));

    return data.getAll('attachment');
}

/** Dispatches a real drag payload because user-event has no file-drop operation. */
function drop(zone: HTMLElement, files: File[]) {
    const dataTransfer = new DataTransfer();

    for (const file of files) dataTransfer.items.add(file);
    zone.dispatchEvent(Object.assign(new Event('drop', { bubbles: true, cancelable: true }), { dataTransfer }));
}

it('does not allow multiple attachments unless explicitly requested', () => {
    // Act
    const output = renderStatic(<FileInput label="Attachment" name="attachment" />);

    // Assert
    expect(output.querySelector('input[type="file"]')).not.toBeNull();
    expect(output.querySelector('input[type="file"]')?.hasAttribute('multiple')).toBe(false);
    expect(output.textContent).toContain('Choose file');
});

it.each(['input', 'dropzone'] as const)(
    'serializes real Files repeatedly and resets or clears %s selections',
    async (mode) => {
        // A picker FileList must never become the persistent value or a duplicate native form entry.
        const user = userEvent.setup();
        const file = new File(['report'], 'report.pdf', { type: 'application/pdf' });
        await withMounted(
            <form>
                <FileInput label="Attachment" name="attachment" mode={mode} required />
            </form>,
            async (output) => {
                const form = control<HTMLFormElement>(output, 'form');
                const input = control<HTMLInputElement>(output, 'input[type="file"]');
                await act(async () => user.upload(input, file));
                expect(input.files?.length).toBe(0);
                expect(collect(form)).toEqual([file]);
                expect(collect(form)[0]).toBe(file);
                expect(form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))).toBe(true);
                form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
                await act(async () => form.reset());
                expect(collect(form)).toEqual([file]);
                await act(async () => form.reset());
                expect(collect(form)).toEqual([]);
                await act(async () => user.upload(input, file));
                await act(async () => user.click(control(output, '[aria-label="Clear Attachment"]')));
                expect(collect(form)).toEqual([]);
                expect(document.activeElement).toBe(output.querySelector('button'));
                await act(async () => {
                    expect(form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))).toBe(false);
                });
            }
        );
    }
);

it('filters MIME, extension and size constraints before publishing, truncates counts, and recovers without stale files', async () => {
    // Invalid files must never reach the Solution callback or serialization, including after a valid selection.
    const user = userEvent.setup({ applyAccept: false });
    const changes: (File | File[] | null)[] = [];
    const image = new File(['1234'], 'image.png', { type: 'image/png' });
    const pdf = new File(['1234'], 'REPORT.PDF', { type: '' });
    const text = new File(['a'], 'secret.txt', { type: 'text/plain' });
    const large = new File(['12345'], 'large.png', { type: 'image/png' });
    const extra = new File(['a'], 'extra.jpg', { type: 'image/jpeg' });
    await withMounted(
        <form>
            <FileInput
                label="Attachment"
                name="attachment"
                multiple
                accept="image/*, .pdf"
                maxSize={4}
                maxFiles={2}
                onChange={(value) => changes.push(value)}
            />
        </form>,
        async (output) => {
            const input = control<HTMLInputElement>(output, 'input[type="file"]');
            const form = control<HTMLFormElement>(output, 'form');
            await act(async () => user.upload(input, [image, text, large, pdf, extra]));
            expect(changes).toEqual([[image, pdf]]);
            expect(collect(form)).toEqual([image, pdf]);
            expect(output.querySelector('[role="alert"]')?.textContent).toContain('secret.txt');
            expect(output.querySelector('[role="alert"]')?.textContent).toContain('large.png');
            await act(async () => {
                expect(form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))).toBe(false);
            });
            await act(async () => user.upload(input, text));
            expect(changes.at(-1)).toBeNull();
            expect(collect(form)).toEqual([]);
            await act(async () => user.upload(input, pdf));
            expect(changes.at(-1)).toEqual([pdf]);
            expect(collect(form)).toEqual([pdf]);
            expect(output.querySelector('[aria-invalid="true"]')).toBeNull();
            expect(form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))).toBe(true);
        }
    );
});

it('validates drops with the same rules, ignores non-file drops, and keeps only the first single file', async () => {
    const first = new File(['a'], 'first.yaml');
    const second = new File(['b'], 'second.yml');
    const wrong = new File(['c'], 'wrong.txt');
    await withMounted(
        <form>
            <FileInput label="Attachment" name="attachment" mode="dropzone" accept=".yaml,.yml" />
        </form>,
        async (output) => {
            const zone = control(output, '.view-file-input');
            const form = control<HTMLFormElement>(output, 'form');
            await act(async () => drop(zone, [first, second]));
            expect(collect(form)).toEqual([first]);
            await act(async () => drop(zone, []));
            expect(collect(form)).toEqual([first]);
            await act(async () => drop(zone, [wrong]));
            expect(collect(form)).toEqual([]);
            expect(output.querySelector('[aria-invalid="true"]')).not.toBeNull();
            await act(async () => drop(zone, [second]));
            expect(collect(form)).toEqual([second]);
        }
    );
});

it('does not publish transient picker files when a controlled caller rejects a selection or clear', async () => {
    const saved = new File(['saved'], 'saved.pdf');
    const replacement = new File(['new'], 'new.pdf');
    const changes: (File | File[] | null)[] = [];
    const user = userEvent.setup();
    await withMounted(
        <form>
            <FileInput label="Attachment" name="attachment" value={saved} onChange={(value) => changes.push(value)} />
        </form>,
        async (output) => {
            const input = control<HTMLInputElement>(output, 'input[type="file"]');
            const form = control<HTMLFormElement>(output, 'form');
            await act(async () => user.upload(input, replacement));
            expect(changes).toEqual([replacement]);
            expect(collect(form)).toEqual([saved]);
            expect(input.files?.length).toBe(0);
            await act(async () => user.click(control(output, '[aria-label="Clear Attachment"]')));
            expect(changes).toEqual([replacement, null]);
            expect(collect(form)).toEqual([saved]);
            await act(async () => form.reset());
            expect(collect(form)).toEqual([saved]);
        }
    );
});

it('opens the native picker once per keyboard activation and preserves the selection on cancel', async () => {
    const user = userEvent.setup();
    const saved = new File(['saved'], 'saved.pdf');
    await withMounted(
        <form>
            <FileInput label="Attachment" name="attachment" value={saved} />
        </form>,
        async (output) => {
            const input = control<HTMLInputElement>(output, 'input[type="file"]');
            let opens = 0;
            input.addEventListener('click', () => opens++);
            await act(async () => user.tab());
            await act(async () => user.keyboard('{Enter} '));
            expect(opens).toBe(2);
            await act(async () => input.dispatchEvent(new Event('cancel', { bubbles: true })));
            expect(collect(control(output, 'form'))).toEqual([saved]);
        }
    );
});

it('keeps disabled fields discoverable but blocks picker, drop, callbacks and form entries', async () => {
    const saved = new File(['saved'], 'saved.pdf');
    const changes: (File | File[] | null)[] = [];
    const user = userEvent.setup();
    await withMounted(
        <form>
            <FileInput
                label="Attachment"
                name="attachment"
                value={saved}
                disabled
                required
                mode="dropzone"
                onChange={(value) => changes.push(value)}
            />
        </form>,
        async (output) => {
            const input = control<HTMLInputElement>(output, 'input[type="file"]');
            const trigger = control(output, 'button');
            const form = control<HTMLFormElement>(output, 'form');
            let opens = 0;
            input.addEventListener('click', () => opens++);
            await act(async () => user.tab());
            expect(document.activeElement).toBe(trigger);
            await act(async () => user.keyboard('{Enter} '));
            await act(async () => user.click(trigger));
            await act(async () => drop(control(output, '.view-file-input'), [saved]));
            expect(opens).toBe(0);
            expect(changes).toEqual([]);
            expect(collect(form)).toEqual([]);
            expect(output.querySelector('[aria-label="Clear Attachment"]')).toBeNull();
            expect(form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))).toBe(true);
        }
    );
});

it('retains trusted Platform read failures as blocking, associated validation status', async () => {
    await withMounted(
        <form>
            <NativeFileInput
                label="Kubeconfig file"
                name="attachment"
                status={{ type: 'error', message: 'Cannot read this file.' }}
            />
        </form>,
        async (output) => {
            const trigger = control(output, 'button');
            expect(output.querySelector(`[id="${trigger.getAttribute('aria-describedby')}"]`)?.textContent).toBe(
                'Cannot read this file.'
            );
            await act(async () => {
                expect(
                    control(output, 'form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
                ).toBe(false);
            });
            expect(document.activeElement).toBe(trigger);
        }
    );
});

it.each([false, true])('forwards description clicks to the guarded picker when disabled=%s', async (disabled) => {
    // Description clicks retain the label hit target without becoming part of the trigger name.
    const user = userEvent.setup();
    const saved = new File(['saved'], 'saved.pdf');

    await withMounted(
        <FileInput
            label="Attachment"
            description="Choose the signed document"
            required
            value={saved}
            disabled={disabled}
        />,
        async (output) => {
            const input = control<HTMLInputElement>(output, 'input[type="file"]');
            const trigger = control(output, 'button');
            const description = control(output, '[id$="-description"]');
            let opens = 0;
            input.addEventListener('click', () => opens++);

            await act(async () => user.click(description));
            expect(opens).toBe(disabled ? 0 : 1);
            expect(trigger.getAttribute('aria-label')).toBe('Attachment, saved.pdf');
            expect(trigger.getAttribute('aria-describedby')?.split(' ')).toContain(description.id);

            const requiredId = trigger
                .getAttribute('aria-describedby')
                ?.split(' ')
                .find((id) => id.endsWith('-required'));

            expect(output.querySelector(`[id="${requiredId}"]`)?.textContent).toBe('Required');
            expect(output.querySelector('label')?.textContent).toContain('Required');
        }
    );
});

it('does not let an untyped View suppress file validation through native-only status props', async () => {
    // Runtime JSX can carry extra props despite the public TypeScript contract.
    const unsupported = { status: { type: 'success' as const, message: 'Approved by the View' } };
    const user = userEvent.setup({ applyAccept: false });

    await withMounted(
        <form>
            <FileInput label="Attachment" name="attachment" accept=".pdf" {...unsupported} />
        </form>,
        async (output) => {
            const input = control<HTMLInputElement>(output, 'input[type="file"]');
            const form = control<HTMLFormElement>(output, 'form');

            await act(async () => user.upload(input, new File(['private'], 'wrong.txt')));
            expect(collect(form)).toEqual([]);
            expect(output.textContent).not.toContain('Approved by the View');
            expect(output.querySelector('[role="alert"]')?.textContent).toContain('wrong.txt');
            await act(async () => {
                expect(form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))).toBe(false);
            });
        }
    );
});
