// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderPlatform } from '../../render';
import Page from '@/platform/routes/user/Organizations';

it('offers onboarding for a user without Organization memberships', () => {
    // Act
    const output = renderPlatform(<Page />, '/user/organizations', [
        ['/api/v1/me/organizations', []],
        ['/api/v1/me/invitations', []]
    ]);

    // Assert
    expect(output.querySelector('h1')?.textContent).toBe('Your Organizations');
    expect(output.textContent).toContain('Create organization');
});

it('lists a pending invitation with accept and decline actions instead of onboarding', () => {
    // Arrange
    const organization = { id: '00000000-0000-4000-8000-000000000001', name: 'Acme', status: 'running' };

    // Act
    const output = renderPlatform(<Page />, '/user/organizations', [
        ['/api/v1/me/organizations', []],
        ['/api/v1/me/invitations', [{ id: '00000000-0000-4000-8000-000000000002', organization, role: 'write' }]]
    ]);

    // Assert
    expect(output.querySelector('h1')?.textContent).toBe('Organizations');
    expect(output.textContent).toContain('Invitation · write');
    expect([...output.querySelectorAll('button')].map((button) => button.textContent)).toEqual(
        expect.arrayContaining(['Decline', 'Accept'])
    );
});
