// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { act, useState } from 'react';
import { withMounted } from '../render';
import { RoleContext } from '@/lib/view-capabilities';
import { useRole } from '@/components/longlink/hooks/use-role';

/** Shows only controls for the exact current role. */
function Actions() {
    const reviewer = useRole('reviewer');
    const reader = useRole('read');

    return <output>{reviewer ? 'Review' : reader ? 'Read' : 'No actions'}</output>;
}

it('returns false without a provider and reacts to role changes and removal', async () => {
    // Arrange
    function View() {
        const [role, setRole] = useState<string | undefined>('reviewer');

        return (
            <>
                <Actions />
                <RoleContext value={role}>
                    <Actions />
                </RoleContext>
                <button onClick={() => setRole('write')}>Write role</button>
                <button onClick={() => setRole('read')}>Read role</button>
                <button onClick={() => setRole(undefined)}>Remove role</button>
            </>
        );
    }

    await withMounted(<View />, async (output) => {
        const actions = output.querySelectorAll('output');
        const buttons = output.querySelectorAll('button');
        expect(actions[0]?.textContent).toBe('No actions');
        expect(actions[1]?.textContent).toBe('Review');

        // Act
        await act(async () => buttons[0]?.click());

        // Assert
        expect(actions[1]?.textContent).toBe('No actions');
        await act(async () => buttons[1]?.click());
        expect(actions[1]?.textContent).toBe('Read');
        await act(async () => buttons[2]?.click());
        expect(actions[1]?.textContent).toBe('No actions');
        expect(actions[0]?.textContent).toBe('No actions');
    });
});
