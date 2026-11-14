// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { Timestamp } from '@/components/custom/timestamp';
import { formatRelativeTimestamp } from '@/lib/timestamp';

it.each([
    ['date', 'Feb 19, 2026'],
    ['date_long', 'February 19, 2026'],
    ['date_weekday', 'Thu, Feb 19, 2026'],
    ['date_time', 'Feb 19, 2026, 5:04 PM'],
    ['time', '5:04 PM'],
    ['system_date', '2026-02-19'],
    ['system_date_time', '2026-02-19 17:04:05'],
    ['system_time', '17:04:05']
] as const)('preserves the %s format in the viewer’s local time', (format, expected) => {
    // A local instant distinguishes viewer-zone formatting from forced UTC formatting.
    const date = new Date(2026, 1, 19, 17, 4, 5);
    const output = renderStatic(<Timestamp value={date.getTime()} format={format} />);
    const time = output.querySelector('time');

    expect(time?.textContent).toBe(expected);
    expect(time?.getAttribute('datetime')).toBe(date.toISOString());
    expect(time?.hasAttribute('tabindex')).toBe(false);
    expect(time?.hasAttribute('aria-label')).toBe(false);
});

it('defaults to date and time and accepts Unix seconds and ISO strings as the same instant', () => {
    // Numeric seconds and milliseconds must not silently point to different years.
    const date = new Date(2026, 1, 19, 17, 4, 5);

    const outputs = [date.getTime(), date.getTime() / 1000, date.toISOString()].map((value) =>
        renderStatic(<Timestamp value={value} />).querySelector('time')
    );

    expect(outputs.map((time) => time?.textContent)).toEqual(Array(3).fill('Feb 19, 2026, 5:04 PM'));
    expect(outputs.map((time) => time?.getAttribute('datetime'))).toEqual(Array(3).fill(date.toISOString()));
});

it.each(['not a date', '', Number.NaN, Number.POSITIVE_INFINITY])(
    'renders invalid dates without crashing: %s',
    (value) => {
        expect(renderStatic(<Timestamp value={value} />).querySelector('time')).toBeNull();
    }
);

it('renders a stable UTC placeholder for relative server markup', () => {
    const output = renderStatic(<Timestamp value="2026-02-19T17:04:05Z" format="relative" />);

    expect(output.querySelector('time')?.textContent).toBe('Feb 19, 2026, 5:04 PM UTC');
    expect(output.querySelector('time')?.hasAttribute('tabindex')).toBe(false);
});

it.each([
    [-9, 'now'],
    [-10, '10 seconds ago'],
    [30, 'now'],
    [31, 'in 31 seconds'],
    [-60, '1 minute ago'],
    [-3600, '1 hour ago'],
    [-86400, 'yesterday'],
    [-172800, '2 days ago'],
    [-2592000, '1 month ago'],
    [-31536000, '1 year ago']
])('retains relative tier boundaries at %s seconds', (seconds, expected) => {
    expect(formatRelativeTimestamp(new Date(1_800_000_000_000 + seconds * 1000), 1_800_000_000_000)).toBe(expected);
});

it('exposes copyable full-date details on keyboard focus without becoming a button or tooltip', async () => {
    const date = new Date(Date.now() - 120_000);

    const fullOptions: Intl.DateTimeFormatOptions = {
        calendar: 'gregory',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
    };

    await withMounted(<Timestamp value={date.toISOString()} format="relative" />, async (output) => {
        const time = output.querySelector('time');
        expect(time?.textContent).toBe('2 minutes ago');
        expect(time?.getAttribute('tabindex')).toBe('0');
        expect(time?.getAttribute('aria-label')).toBe(
            new Intl.DateTimeFormat('en', { ...fullOptions, timeZoneName: 'long' }).format(date)
        );

        await act(async () => time?.focus());
        await vi.waitFor(() => {
            expect(document.querySelector('[role="dialog"] dd span')?.textContent).toBe(
                new Intl.DateTimeFormat('en', fullOptions).format(date)
            );
        });
        expect(time?.getAttribute('aria-controls')).toBe(document.querySelector('[role="dialog"]')?.id);
        expect(time?.hasAttribute('role')).toBe(false);
        expect(time?.hasAttribute('aria-haspopup')).toBe(false);
        expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Timestamp details');
        expect(document.querySelector('[role="tooltip"]')).toBeNull();
    });
});

it('copies through the keyboard, announces success, resets feedback, and never submits the surrounding form', async () => {
    // user-event supplies the clipboard boundary; focus, Tab, Enter, and the copy operation remain real.
    const user = userEvent.setup();
    const submitted = vi.fn();
    const date = new Date(Date.now() - 120_000);

    await withMounted(
        <form
            onSubmit={(event) => {
                event.preventDefault();
                submitted();
            }}
        >
            <Timestamp value={date.toISOString()} format="relative" />
            <button type="submit">Save</button>
        </form>,
        async (output) => {
            const time = output.querySelector('time');
            await act(async () => await user.tab());
            expect(document.activeElement).toBe(time);

            await vi.waitFor(() => expect(document.querySelector('[role="dialog"] button')).not.toBeNull());
            await act(async () => await user.tab());
            const copyButton = document.querySelector('[role="dialog"] button');
            expect(document.activeElement).toBe(copyButton);
            expect(copyButton?.getAttribute('type')).toBe('button');

            const fullDate = document.querySelector('[role="dialog"] dd span')?.textContent;
            await act(async () => await user.keyboard('{Enter}'));

            expect(await navigator.clipboard.readText()).toBe(fullDate);
            expect(copyButton?.getAttribute('aria-label')).toBe('Copied');
            expect(document.querySelector('[role="status"]')?.textContent).toBe('Copied');
            expect(submitted).not.toHaveBeenCalled();

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 1500));
            });
            expect(copyButton?.getAttribute('aria-label')).toBe(`Copy ${fullDate}`);
            expect(document.querySelector('[role="status"]')?.textContent).toBe('');

            await act(async () => await user.keyboard('{Escape}'));
            await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
            expect(document.activeElement).toBe(time);
        }
    );
});

it('keeps clipboard rejection silent instead of reporting a false copy success', async () => {
    const user = userEvent.setup();

    const write = vi
        .spyOn(navigator.clipboard, 'writeText')
        .mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));

    try {
        await withMounted(<Timestamp value={new Date().toISOString()} format="relative" />, async () => {
            await act(async () => await user.tab());
            await vi.waitFor(() => expect(document.querySelector('[role="dialog"] button')).not.toBeNull());
            await act(async () => await user.tab());
            await act(async () => await user.keyboard('{Enter}'));

            expect(write).toHaveBeenCalledTimes(1);
            expect(document.querySelector('[role="dialog"] button')?.getAttribute('aria-label')).toMatch(/^Copy /);
            expect(document.querySelector('[role="status"]')?.textContent).toBe('');
            expect(document.querySelector('.lucide-check')).toBeNull();
        });
    } finally {
        write.mockRestore();
    }
});

it('keeps hovered timestamp details open while the pointer moves onto its copy action', async () => {
    const user = userEvent.setup();

    await withMounted(<Timestamp value={new Date().toISOString()} format="relative" />, async (output) => {
        const time = output.querySelector('time');

        if (!time) throw new Error('Missing timestamp');

        await act(async () => {
            await user.hover(time);
            await new Promise((resolve) => setTimeout(resolve, 350));
        });

        const copyButton = document.querySelector('[role="dialog"] button');

        if (!(copyButton instanceof HTMLElement)) throw new Error('Missing copy action');

        await act(async () => {
            await user.hover(copyButton);
            await new Promise((resolve) => setTimeout(resolve, 250));
        });

        expect(document.querySelector('[role="dialog"] button')).toBe(copyButton);
        expect(document.querySelector('[role="tooltip"]')).toBeNull();
    });
});
