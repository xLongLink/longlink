import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { Menu } from '@/components/longlink/layout/menu';
import { MenuNavigationContext } from '@/lib/view-capabilities';
// @vitest-environment happy-dom
import { act, useEffect, useState, type FormEvent } from 'react';

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
                <Menu
                    sections={[
                        {
                            title: 'Workspace',
                            entries: [
                                { kind: 'item', label: 'Orders', content: <Orders /> },
                                { kind: 'item', label: 'Archive', content: <Archive /> }
                            ]
                        }
                    ]}
                />
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

it('retains the draft when expanding navigation and keeps it expanded during editing', async () => {
    const user = userEvent.setup();

    await withMounted(
        <MenuNavigationContext value={{ hash: '', select: () => {} }}>
            <Menu
                sections={[
                    {
                        title: 'Workspace',
                        isHeaderHidden: true,
                        entries: [
                            { kind: 'item', label: 'Orders', content: <input aria-label="Order draft" /> },
                            {
                                kind: 'subsection',
                                label: 'Advanced',
                                icon: 'database',
                                items: [{ label: 'Billing', content: 'Billing settings' }]
                            }
                        ]
                    }
                ]}
            />
        </MenuNavigationContext>,
        async (output) => {
            const input = output.querySelector<HTMLInputElement>('input');
            const trigger = output.querySelector<HTMLButtonElement>('button');
            const navigation = output.querySelector('nav');

            if (!input || !trigger) throw new Error('Expected draft input and disclosure');
            expect(trigger.getAttribute('aria-expanded')).toBe('false');
            await act(async () => user.type(input, 'Retained'));
            await act(async () => user.click(trigger));
            expect(input.value).toBe('Retained');
            expect(trigger.getAttribute('aria-expanded')).toBe('true');
            await act(async () => user.type(input, ' order'));

            expect(output.querySelector('nav')).toBe(navigation);
            expect(output.querySelector('input')).toBe(input);
            expect(input.value).toBe('Retained order');
            expect(trigger.getAttribute('aria-expanded')).toBe('true');
        }
    );
});

it('supports keyboard disclosure without submitting and leaves modified or canceled links to their owner', async () => {
    const select = vi.fn();
    const submit = vi.fn((event: FormEvent) => event.preventDefault());
    const user = userEvent.setup();

    await withMounted(
        <form onSubmit={submit}>
            <MenuNavigationContext value={{ hash: '#billing', select }}>
                <Menu
                    sections={[
                        {
                            title: 'Workspace',
                            entries: [
                                {
                                    kind: 'subsection',
                                    label: 'Advanced',
                                    items: [{ label: 'Billing', content: 'Billing settings' }]
                                }
                            ]
                        }
                    ]}
                />
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

it('preserves punctuation-derived fragments when selecting nested items', async () => {
    const select = vi.fn();

    await withMounted(
        <MenuNavigationContext value={{ hash: '#tax-fees-2026', select }}>
            <Menu
                sections={[
                    {
                        title: 'Workspace',
                        entries: [
                            {
                                kind: 'subsection',
                                label: 'Finance',
                                items: [{ label: '  Tax & fees (2026)!  ', content: <p>Tax settings</p> }]
                            },
                            { kind: 'item', label: 'Later', content: <p>Later settings</p> }
                        ]
                    }
                ]}
            />
        </MenuNavigationContext>,
        async (output) => {
            const link = output.querySelector<HTMLAnchorElement>('a[aria-current="page"]');

            if (!link) throw new Error('Expected the tax navigation');
            expect(link.getAttribute('href')).toBe('#tax-fees-2026');
            expect(output.querySelector('p')?.textContent).toBe('Tax settings');
            await act(async () => {
                link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            });
            expect(select).toHaveBeenCalledExactlyOnceWith('tax-fees-2026');
        }
    );
});
