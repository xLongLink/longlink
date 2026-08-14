import { z } from 'zod';
import { useEffect } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { AuthPage } from '@/components/AuthPage';
import { ApiError, requestApi } from '@/lib/api';
import { platformApiPath } from '@/lib/platform-api';
import { PasswordInput } from '@/components/PasswordInput';
import { useFragmentToken } from '@/hooks/use-fragment-token';

type ResetPasswordValues = {
    password: string;
};

const PASSWORD_RESET_TOKEN_KEY = 'longlink.password-reset.token';
const passwordSchema = z.object({
    password: z.string().min(1, 'Password is required').max(1024, 'Password cannot exceed 1024 characters'),
});

/** Accepts a password reset token and saves a new password. */
export default function ResetPassword() {
    const showToast = useToast();
    const token = useFragmentToken(PASSWORD_RESET_TOKEN_KEY);
    const form = useForm<ResetPasswordValues>({
        defaultValues: { password: '' },
        resolver: zodResolver(passwordSchema),
    });
    const verification = useMutation({
        mutationFn: async (resetToken: string) => {
            if (!resetToken) {
                await requestApi(platformApiPath('/auth/reset-password/setup'));

                return;
            }

            await requestApi(platformApiPath('/auth/reset-password/verify'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: resetToken }),
            });
        },
        onSuccess: () => {
            sessionStorage.removeItem(PASSWORD_RESET_TOKEN_KEY);
        },
        onError: (error) => {
            // Invalid credentials cannot become valid through another retry.
            if (error instanceof ApiError && error.code === 'RESET_PASSWORD_BAD_TOKEN') {
                sessionStorage.removeItem(PASSWORD_RESET_TOKEN_KEY);
            }
        },
    });
    const resetPassword = useMutation({
        mutationFn: async (payload: ResetPasswordValues) => {
            await requestApi(platformApiPath('/auth/reset-password'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        },
    });
    const hasTokenError =
        (verification.error instanceof ApiError && verification.error.code === 'RESET_PASSWORD_BAD_TOKEN') ||
        (resetPassword.error instanceof ApiError && resetPassword.error.code === 'RESET_PASSWORD_BAD_TOKEN');

    /** Saves the new password while keeping invalid-token failures inline. */
    async function handleResetPassword(payload: ResetPasswordValues) {
        try {
            await resetPassword.mutateAsync(payload);
        } catch (error) {
            // The bad-token response blocks this workflow and is rendered below.
            if (error instanceof ApiError && error.status === 400 && error.code === 'RESET_PASSWORD_BAD_TOKEN') {
                return;
            }

            showToast({
                body: error instanceof Error ? error.message : 'Please try again in a moment.',
                type: 'error',
            });
        }
    }

    useEffect(() => {
        verification.mutate(token);

        // oxlint-disable-next-line react-hooks/exhaustive-deps -- React Query keeps the mutate callback stable.
    }, [token, verification.mutate]);

    // Invalid and expired credentials require a replacement email.
    if (hasTokenError) {
        return (
            <AuthPage
                title="Set a new password"
                description="This password reset link is invalid or expired. Request a new link to continue."
            >
                <Stack gap={4}>
                    <Banner
                        status="error"
                        title="This password reset link is invalid or expired. Request a new link to continue."
                    />
                    <Button href="/auth/forgot-password" label="Request another reset link" variant="primary" />
                </Stack>
            </AuthPage>
        );
    }

    // Keep transient exchange failures retryable without exposing the credential again.
    if (verification.error) {
        return (
            <AuthPage title="Set a new password" description="Please try again in a moment.">
                <Button label="Retry" onClick={() => verification.mutate(token)} variant="primary" />
            </AuthPage>
        );
    }

    // Do not collect a password until the server has moved reset proof into its restricted cookie.
    if (!verification.isSuccess) {
        return (
            <AuthPage title="Set a new password" description="Choose a new password for your LongLink account.">
                <Button isLoading label="Reset password" variant="primary" />
            </AuthPage>
        );
    }

    return (
        <AuthPage title="Set a new password" description="Choose a new password for your LongLink account.">
            {resetPassword.isSuccess ? (
                <Stack gap={4}>
                    <Banner status="success" title="Your password has been reset. You can now sign in." />
                    <Button href="/organizations" label="Back to sign in" variant="primary" />
                </Stack>
            ) : (
                <Stack as="form" gap={4} onSubmit={form.handleSubmit(handleResetPassword)}>
                    <Controller
                        control={form.control}
                        name="password"
                        render={({ field, fieldState }) => (
                            <PasswordInput
                                ref={field.ref}
                                autoComplete="new-password"
                                htmlName={field.name}
                                isRequired
                                label="New password"
                                onBlur={field.onBlur}
                                onChange={field.onChange}
                                status={
                                    fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined
                                }
                                value={field.value}
                                width="100%"
                            />
                        )}
                    />
                    <Button
                        isLoading={resetPassword.isPending}
                        label={resetPassword.isPending ? 'Resetting password...' : 'Reset password'}
                        type="submit"
                        variant="primary"
                    />
                </Stack>
            )}
        </AuthPage>
    );
}
