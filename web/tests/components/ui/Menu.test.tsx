import { it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
// @vitest-environment happy-dom
import { act, useEffect, useState, type FormEvent } from 'react';
import { MenuNavigationContext } from '@/components/custom/contexts';
import { Menu, MenuSection, MenuItem, MenuSubSection } from '@/components/custom/Menu';

it('selects the first authored item before fragment navigation', () => {
    // Act
    const output = renderStatic(
        <MenuNavigationContext value={{ hash: '', select: () => undefined }}>
            <Menu>
                <MenuSection title="Workspace">
                    <MenuItem label="Orders">Order content</MenuItem>
                    <MenuItem label="Archive">Archive content</MenuItem>
                </MenuSection>
            </Menu>
        </MenuNavigationContext>
    );

    // Assert
    expect(output.textContent).toContain('Order content');
    expect(output.textContent).not.toContain('Archive content');
});

it('mounts only selected content and responds to both user selection and an external fragment change', async () => {
    const loaded: string[] = [];
    const unloaded: string[] = [];
    const user = userEvent.setup();

    function Orders() {
        useEffect(() => {
            loaded.push('orders');

            return () => {
                unloaded.push('orders');
            };
        }, []);

        return <input aria-label="Order draft" />;
    }

    function Archive() {
        useEffect(() => {
            loaded.push('archive');

            return () => {
                unloaded.push('archive');
            };
        }, []);

        return <p>Archived orders</p>;
    }

    function Probe() {
        const [hash, setHash] = useState('');

        return (
            <MenuNavigationContext value={{ hash, select: (id) => setHash(`#${id}`) }}>
                <button type="button" onClick={() => setHash('#unknown')}>
                    Unknown fragment
                </button>
                <Menu>
                    <MenuSection title="Workspace">
                        <MenuItem label="Orders">
                            <Orders />
                        </MenuItem>
                        <MenuItem label="Archive">
                            <Archive />
                        </MenuItem>
                    </MenuSection>
                </Menu>
            </MenuNavigationContext>
        );
    }

    await withMounted(<Probe />, async (output) => {
        expect(loaded).toEqual(['orders']);
        const archive = output.querySelector<HTMLAnchorElement>('a[href="#archive"]');

        if (!archive) throw new Error('Expected archive navigation');
        await act(async () => user.click(archive));
        expect(loaded).toEqual(['orders', 'archive']);
        expect(unloaded).toEqual(['orders']);
        expect(output.querySelector('input')).toBeNull();
        expect(output.querySelector('a[aria-current="page"]')).toBe(archive);

        const external = output.querySelector('button');

        if (!external) throw new Error('Expected the external fragment update');
        await act(async () => user.click(external));
        expect(unloaded).toEqual(['orders', 'archive']);
        expect(output.querySelector('input[aria-label="Order draft"]')).not.toBeNull();
        expect(output.querySelector('a[aria-current="page"]')?.getAttribute('href')).toBe('#orders');
    });
});

it('retains an entered draft and expanded navigation while the viewport crosses the rail breakpoint', async () => {
    const width = window.innerWidth;
    const user = userEvent.setup();

    try {
        window.innerWidth = 1000;
        await withMounted(
            <MenuNavigationContext value={{ hash: '', select: () => {} }}>
                <Menu>
                    <MenuSection title="Workspace" isHeaderHidden>
                        <MenuItem label="Orders">
                            <input aria-label="Order draft" />
                        </MenuItem>
                        <MenuSubSection label="Advanced" icon="database">
                            <MenuItem label="Billing">Billing settings</MenuItem>
                        </MenuSubSection>
                    </MenuSection>
                </Menu>
            </MenuNavigationContext>,
            async (output) => {
                const input = output.querySelector<HTMLInputElement>('input');
                const trigger = output.querySelector<HTMLButtonElement>('button');
                const navigation = output.querySelector('nav');

                if (!input || !trigger) throw new Error('Expected draft input and disclosure');
                expect(trigger.getAttribute('aria-expanded')).toBe('false');
                await act(async () => user.click(trigger));
                await act(async () => user.type(input, 'Retained order'));

                for (const nextWidth of [768, 769]) {
                    await act(async () => {
                        window.innerWidth = nextWidth;
                        window.dispatchEvent(new Event('resize'));
                    });
                    expect(output.querySelector('nav')).toBe(navigation);
                    expect(output.querySelector('input')).toBe(input);
                    expect(input.value).toBe('Retained order');
                    expect(trigger.getAttribute('aria-expanded')).toBe('true');
                }
            }
        );
    } finally {
        window.innerWidth = width;
        window.dispatchEvent(new Event('resize'));
    }
});

it('supports keyboard disclosure without submitting and leaves modified or canceled links to their owner', async () => {
    const select = vi.fn();
    const submit = vi.fn((event: FormEvent) => event.preventDefault());
    const user = userEvent.setup();

    await withMounted(
        <form onSubmit={submit}>
            <MenuNavigationContext value={{ hash: '#billing', select }}>
                <Menu>
                    <MenuSection title="Workspace">
                        <MenuSubSection label="Advanced">
                            <MenuItem label="Billing">Billing settings</MenuItem>
                        </MenuSubSection>
                    </MenuSection>
                </Menu>
            </MenuNavigationContext>
        </form>,
        async (output) => {
            const trigger = output.querySelector('button');
            const link = output.querySelector<HTMLAnchorElement>('a[href="#billing"]');

            if (!trigger || !link) throw new Error('Expected the billing navigation');
            await act(async () => {
                trigger.focus();
                await user.keyboard('{Enter}');
            });
            expect(trigger.getAttribute('aria-expanded')).toBe('true');
            await act(async () => user.tab());
            expect(document.activeElement).toBe(link);
            expect(submit).not.toHaveBeenCalled();

            const modified = new MouseEvent('click', { button: 0, ctrlKey: true, bubbles: true, cancelable: true });
            await act(async () => {
                link.dispatchEvent(modified);
            });
            expect(modified.defaultPrevented).toBe(false);
            expect(select).not.toHaveBeenCalled();
            link.addEventListener('click', (event) => event.preventDefault(), { capture: true, once: true });
            await act(async () => user.click(link));
            expect(select).not.toHaveBeenCalled();
            await act(async () => user.click(link));
            expect(select).toHaveBeenCalledExactlyOnceWith('billing');
        }
    );
});
