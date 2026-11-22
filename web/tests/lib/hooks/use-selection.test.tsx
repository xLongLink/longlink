// @vitest-environment happy-dom
import { act } from 'react';
import { expect, it } from 'vitest';
import { withMounted } from '../../render';
import { useSelection } from '@/lib/hooks/use-selection';

it('keeps replacement attempts open when an older render closes, including an empty render', async () => {
    // Arrange
    let selection!: ReturnType<typeof useSelection<{ kind: 'create' }>>;

    function Selection() {
        selection = useSelection<{ kind: 'create' }>();

        return null;
    }

    await withMounted(<Selection />, async () => {
        const closeEmpty = selection[2];
        const first = { kind: 'create' } as const;
        await act(async () => selection[1](first));
        const closeFirst = selection[2];

        // Act
        const replacement = { kind: 'create' } as const;
        await act(async () => selection[1](replacement));
        await act(async () => {
            closeEmpty();
            closeFirst();
        });

        // Assert
        expect(selection[0]).toBe(replacement);
        await act(async () => selection[2]());
        expect(selection[0]).toBeNull();
    });
});

it('retains attempt identity through functional updates and closes it from an earlier render', async () => {
    // Arrange
    let selection!: ReturnType<typeof useSelection<symbol>>;

    function Selection() {
        selection = useSelection<symbol>();

        return null;
    }

    await withMounted(<Selection />, async () => {
        const attempt = Symbol();
        await act(async () => selection[1](attempt));
        const closeAttempt = selection[2];

        // Act
        await act(async () => selection[1]((current) => current ?? Symbol()));

        // Assert
        expect(selection[0]).toBe(attempt);
        await act(async () => closeAttempt());
        expect(selection[0]).toBeNull();
    });
});
