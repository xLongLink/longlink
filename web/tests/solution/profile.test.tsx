// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act, useEffect } from 'react';
import { withMounted } from '../render';
import { it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { DevelopmentProfile } from '@/solution/profile';
import { developmentCookie, getDevelopmentUser } from '@/solution/development';

it('installs the initial request persona before passive requests and reloads only after persisting a new persona', async () => {
    // Observe the real cookie boundary; replace only terminal document reload.
    const previousCookie = document.cookie;
    document.cookie = `${developmentCookie}=; Path=/; Max-Age=0`;
    const observedRoles: string[] = [];

    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {
        expect(getDevelopmentUser().role).toBe('read');
        expect(document.cookie).toContain(developmentCookie);
    });

    const events = userEvent.setup();

    /** Models the isolated View's passive business-request startup. */
    function BusinessRequests() {
        useEffect(() => {
            expect(document.cookie).toContain(developmentCookie);
            observedRoles.push(getDevelopmentUser().role);
        }, []);

        return null;
    }

    try {
        await withMounted(
            <>
                <DevelopmentProfile />
                <BusinessRequests />
            </>,
            async (output) => {
                expect(observedRoles).toEqual(['write']);
                const trigger = output.querySelector('button');

                if (!trigger) throw new Error('Missing development trigger');
                await act(async () => await events.click(trigger));
                const popup = document.querySelector('[role="dialog"]');
                expect(popup?.querySelector('a[href="/user/settings"]')).toBeNull();
                expect(popup?.textContent).not.toContain('Sign out');
                const docs = popup?.querySelector('a');
                expect(docs?.target).toBe('_blank');
                expect(docs?.relList.contains('noopener')).toBe(true);
                const readUser = popup?.querySelector<HTMLButtonElement>('button[aria-pressed="false"]');

                if (!readUser) throw new Error('Missing read persona');
                await act(async () => await events.click(readUser));
                expect(reload).toHaveBeenCalledTimes(1);
                expect(getDevelopmentUser().role).toBe('read');
                expect(observedRoles).toEqual(['write']);
            }
        );
    } finally {
        reload.mockRestore();
        document.cookie = `${developmentCookie}=; Path=/; Max-Age=0`;
        const previousPersona = previousCookie.split('; ').find((cookie) => cookie.startsWith(`${developmentCookie}=`));

        if (previousPersona) document.cookie = `${previousPersona}; Path=/; SameSite=Strict`;
    }
});
