import { z } from 'zod';
import { useState } from 'react';
import { TextField } from './Field';
import { AuthLayout } from './AuthLayout';
import { api, ApiError } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { passwordSchema } from './validation';
import { NoIndex } from '@/components/NoIndex';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFragmentToken } from '@/lib/hooks/use-fragment-token';
import { useVerification, type VerificationRequest } from '@/lib/hooks/use-verification';

const PASSWORD_RESET_TOKEN_KEY = 'longlink.password-reset.token';

const resetPasswordSchema = z.object({
    password: passwordSchema,
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/** Returns whether an API error reports an invalid or expired reset token. */
function isBadTokenError(cause: unknown): boolean {
    return cause instanceof ApiError && cause.status === 400;
}

/** Accepts a password reset token and saves a new password. */
export default function ResetPassword() {
    const token = useFragmentToken(PASSWORD_RESET_TOKEN_KEY);

    const form = useForm<ResetPasswordValues>({
        defaultValues: { password: '' },
        resolver: zodResolver(resetPasswordSchema),
    });

    const [verification, setVerification] = useState<{ status: 'verified' } | { status: 'error' } | null>(null);
    const [reset, setReset] = useState<{ status: 'saved' } | { status: 'error' } | null>(null);

    /** Verifies the credential and ignores results from canceled or replaced attempts. */
    async function verify({ signal, token: resetToken }: VerificationRequest) {
        setVerification(null);

        // Exchange the URL credential, or recover the already established setup cookie.
        const request = resetToken
            ? api('/api/v1/auth/reset-password/verify', {
                  json: { token: resetToken },
                  method: 'POST',
                  signal,
              })
            : api('/api/v1/auth/reset-password/setup', { signal });

        await request.then(
            () => {
                if (signal.aborted) return;
                sessionStorage.removeItem(PASSWORD_RESET_TOKEN_KEY);
                setVerification({ status: 'verified' });
            },
            (cause: unknown) => {
                if (signal.aborted) return;

                if (!isBadTokenError(cause)) throw cause;
                sessionStorage.removeItem(PASSWORD_RESET_TOKEN_KEY);
                setVerification({ status: 'error' });
            }
        );
    }

    useVerification(token, verify);

    const pageMetadata = <NoIndex title="Set a New Password | LongLink" />;

    // Invalid and expired credentials require a replacement email.
    if (verification?.status === 'error' || reset?.status === 'error') {
        return (
            <AuthLayout
                title="Set a new password"
                description="This password reset link is invalid or expired. Request a new link to continue."
            >
                {pageMetadata}
                <Button href="/auth/forgot-password" label="Request another reset link" variant="primary" />
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title="Set a new password" description="Choose a new password for your LongLink account.">
            {pageMetadata}
            {verification?.status !== 'verified' ? (
                <Button isLoading label="Reset password" variant="primary" />
            ) : reset?.status === 'saved' ? (
                <Stack gap={4}>
                    <Banner status="success" title="Your password has been reset. You can now sign in." />
                    <Button href="/login" label="Back to sign in" variant="primary" />
                </Stack>
            ) : (
                <form
                    action={() =>
                        form.handleSubmit(async (payload) => {
                            // Publish the saved result only after the password change succeeds.
                            await api('/api/v1/auth/reset-password', { json: payload, method: 'POST' }).then(
                                () => setReset({ status: 'saved' }),
                                (cause: unknown) => {
                                    if (!isBadTokenError(cause)) throw cause;
                                    setReset({ status: 'error' });
                                }
                            );
                        })()
                    }
                >
                    <Stack gap={4}>
                        <TextField
                            control={form.control}
                            name="password"
                            isRequired
                            label="New password"
                            width="100%"
                            type="password"
                        />
                        <Button label="Reset password" type="submit" variant="primary" />
                    </Stack>
                </form>
            )}
        </AuthLayout>
    );
}
