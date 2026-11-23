// @vitest-environment happy-dom
import { act } from 'react';
import { withMounted } from '../../../render';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import DeploymentReview from '@/platform/routes/orgs/dialogs/deployment-review';

const solutionId = '00000000-0000-4000-8000-000000000002';

const revisionId = '00000000-0000-4000-8000-000000000001';

const candidate = {
    current_image: `ghcr.io/owner/sample@sha256:${'a'.repeat(64)}`,
    revision_id: revisionId,
    configured_envs: [],
    metadata: { image: `ghcr.io/owner/sample@sha256:${'b'.repeat(64)}`, environments: [] }
};

const secretCandidate = {
    ...candidate,
    configured_envs: ['REQUIRED_SECRET', 'OPTIONAL_SECRET'],
    metadata: {
        ...candidate.metadata,
        environments: [
            { name: 'REQUIRED_SECRET', required: true },
            { name: 'NEW_SECRET', required: true },
            { name: 'OPTIONAL_SECRET', required: false }
        ]
    }
};

describe('DeploymentReview', () => {
    it('retries a failed inspection and deploys the recovered reviewed revision', async () => {
        // Arrange
        const recoveredRevisionId = '00000000-0000-4000-8000-000000000003';
        const recoveredCandidate = { ...candidate, revision_id: recoveredRevisionId };

        const inspect = vi
            .fn<() => Response>()
            .mockImplementationOnce(() => Response.json({ detail: 'Image inspection unavailable' }, { status: 503 }))
            .mockImplementation(() => Response.json(recoveredCandidate));

        const onSuccess = vi.fn();
        await withReview(
            inspect,
            async (submissions) => {
                // Assert
                expect([...document.querySelectorAll('[role="status"]')].map((item) => item.textContent)).toContain(
                    'Could not check for updates.'
                );
                expect(button('Retry').getAttribute('aria-disabled')).toBeNull();
                expect([...document.querySelectorAll('button')].map((item) => item.textContent)).not.toContain('Next');
                expect([...document.querySelectorAll('button')].map((item) => item.textContent)).not.toContain(
                    'Update solution'
                );
                expect(inspect).toHaveBeenCalledTimes(1);
                expect(submissions).toEqual([]);
                expect(onSuccess).not.toHaveBeenCalled();

                // Act
                await act(async () => button('Retry').click());
                await act(async () => vi.waitFor(() => button('Next')));

                // Assert
                expect(document.body.textContent).toContain('sha256:bbbbbbbbbbbb');
                expect(document.body.textContent).not.toContain('Could not check for updates.');
                expect(inspect).toHaveBeenCalledTimes(2);
                expect(submissions).toEqual([]);
                expect(onSuccess).not.toHaveBeenCalled();

                // Act
                await act(async () => button('Next').click());
                expect(submissions).toEqual([]);
                expect(document.body.textContent).toContain('No required environments.');
                await act(async () => button('Next').click());
                expect(submissions).toEqual([]);
                expect(document.body.textContent).toContain('No optional environments.');
                await act(async () => vi.waitFor(() => expect(button('Update solution').disabled).toBe(false)));
                await act(async () => button('Update solution').click());

                // Assert
                await vi.waitFor(() => {
                    expect(submissions).toEqual([
                        {
                            path: `/api/v1/solutions/${solutionId}/update`,
                            body: { envs: {}, expected_revision_id: recoveredRevisionId }
                        }
                    ]);
                    expect(onSuccess).toHaveBeenCalledTimes(1);
                });
            },
            onSuccess
        );
    });

    it('validates required secrets, preserves drafts across steps, and submits only on the final step', async () => {
        // Arrange
        await withReview(
            () => Response.json(secretCandidate),
            async (submissions) => {
                const user = userEvent.setup();

                // Act
                await act(async () => user.click(button('Next')));
                expect(input('REQUIRED_SECRET').value).toBe('');
                expect(document.body.textContent).not.toContain('OPTIONAL_SECRET');
                await act(async () => button('Next').click());
                expect(document.activeElement).toBe(input('NEW_SECRET'));
                expect(submissions).toEqual([]);
                await act(async () => user.type(input('NEW_SECRET'), '   '));
                await act(async () => user.click(input('NEW_SECRET')));
                await act(async () => user.keyboard('{Enter}'));
                expect(submissions).toEqual([]);
                const form = input('NEW_SECRET').form;

                if (!form) throw new Error('Expected the deployment form');

                await act(async () => form.requestSubmit());
                expect(input('NEW_SECRET').getAttribute('aria-invalid')).toBe('true');
                expect(document.activeElement).toBe(input('NEW_SECRET'));
                expect(document.body.textContent).toContain('Please complete this field.');
                expect(submissions).toEqual([]);
                await act(async () => user.clear(input('NEW_SECRET')));
                await act(async () => user.type(input('NEW_SECRET'), 'new-fixture-value'));
                await act(async () => user.keyboard('{Enter}'));
                expect(submissions).toEqual([]);
                await act(async () => {
                    form.requestSubmit();
                    form.requestSubmit();
                });
                expect(document.body.textContent).not.toContain('REQUIRED_SECRET');
                expect(submissions).toEqual([]);
                await act(async () => user.type(input('OPTIONAL_SECRET'), 'replacement-fixture-value'));
                await act(async () => user.click(label('Remove OPTIONAL_SECRET')));
                await act(async () => user.click(button('Back')));
                expect(input('NEW_SECRET').value).toBe('new-fixture-value');
                expect(input('REQUIRED_SECRET').value).toBe('');
                await act(async () => user.click(button('Back')));
                expect(document.body.textContent).toContain('sha256:bbbbbbbbbbbb');
                await act(async () => user.click(button('Next')));
                expect(input('NEW_SECRET').value).toBe('new-fixture-value');
                await act(async () => user.click(button('Next')));
                expect(input('OPTIONAL_SECRET').value).toBe('replacement-fixture-value');
                expect(input('OPTIONAL_SECRET').disabled).toBe(true);
                expect(submissions).toEqual([]);
                await act(async () => button('Update solution').click());

                // Assert
                await vi.waitFor(() =>
                    expect(submissions).toEqual([
                        {
                            path: `/api/v1/solutions/${solutionId}/update`,
                            body: {
                                envs: { NEW_SECRET: 'new-fixture-value', OPTIONAL_SECRET: null },
                                expected_revision_id: revisionId
                            }
                        }
                    ])
                );
            }
        );
    });

    it('deploys an environment-only change and retains the edit when removal is toggled off', async () => {
        // Arrange
        await withReview(
            () =>
                Response.json({
                    ...secretCandidate,
                    current_image: secretCandidate.metadata.image,
                    configured_envs: [...secretCandidate.configured_envs, 'NEW_SECRET']
                }),
            async (submissions) => {
                const user = userEvent.setup();
                await act(async () => button('Next').click());
                await act(async () => button('Next').click());
                expect(button('Update solution').disabled).toBe(true);

                // Act
                await act(async () => user.type(input('OPTIONAL_SECRET'), 'replacement-fixture-value'));
                await act(async () => user.click(label('Remove OPTIONAL_SECRET')));
                await act(async () => user.click(label('Remove OPTIONAL_SECRET')));
                await act(async () => button('Update solution').click());

                // Assert
                await vi.waitFor(() =>
                    expect(submissions).toEqual([
                        {
                            path: `/api/v1/solutions/${solutionId}/update`,
                            body: {
                                envs: { OPTIONAL_SECRET: 'replacement-fixture-value' },
                                expected_revision_id: revisionId
                            }
                        }
                    ])
                );
            }
        );
    });

    /** Mounts the dialog with shared UI providers and an isolated HTTP boundary. */
    async function withReview(
        inspect: () => Response,
        check: (submissions: { path: string; body: unknown }[]) => Promise<void>,
        onSuccess: () => void = () => {}
    ) {
        const submissions: { path: string; body: unknown }[] = [];
        const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
            const request = input instanceof Request ? input : new Request(input, init);
            const path = new URL(request.url).pathname;

            if (path !== `/api/v1/solutions/${solutionId}/update`)
                throw new Error(`Unexpected request ${request.method} ${path}`);

            if (request.method === 'POST') {
                submissions.push({ path, body: await request.json() });

                return new Response(null, { status: 204 });
            }

            return inspect();
        });
        try {
            await withMounted(
                <DeploymentReview
                    item={{ id: solutionId, name: 'Sample' }}
                    onSuccess={onSuccess}
                    onOpenChange={() => {}}
                />,
                async () => {
                    await act(async () =>
                        vi.waitFor(() => expect(document.body.textContent).not.toContain('Checking for updates…'))
                    );
                    await check(submissions);
                }
            );
        } finally {
            transport.mockRestore();
        }
    }

    /** Finds a secret input through its visible label. */
    function input(label: string): HTMLInputElement {
        const found = [...document.querySelectorAll('label')].find((item) => item.textContent?.startsWith(label));
        const control = found?.htmlFor ? document.getElementById(found.htmlFor) : found?.querySelector('input');

        if (!(control instanceof HTMLInputElement)) throw new Error(`Input not found: ${label}`);

        return control;
    }

    /** Finds the removal label without depending on its underlying checkbox element. */
    function label(text: string) {
        const found = [...document.querySelectorAll('label')].find((item) => item.textContent?.startsWith(text));

        if (!found) throw new Error(`Label not found: ${text}`);

        return found;
    }

    /** Find the named native action without replacing UI components. */
    function button(label: string) {
        const found = [...document.querySelectorAll('button')].find((item) => item.textContent === label);

        if (!found) throw new Error(`Button not found: ${label}`);

        return found;
    }
});
