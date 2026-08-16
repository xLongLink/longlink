import { z } from 'zod';
import { Stack } from '@astryxdesign/core/Stack';
import { useEffect, useEffectEvent } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { TextInput } from '@astryxdesign/core/TextInput';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/lib/hooks/use-toast';
import { useFragmentToken } from '@/lib/hooks/use-fragment-token';
import { AuthLayout } from './AuthLayout';
import { passwordSchema } from './validation';

const PASSWORD_RESET_TOKEN_KEY = 'longlink.password-reset.token';
const resetPasswordSchema = z.object({
    password: passwordSchema,
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/** Accepts a password reset token and saves a new password. */
export default function ResetPassword() {
    const showToast = useToast();
    const token = useFragmentToken(PASSWORD_RESET_TOKEN_KEY);
    const form = useForm<ResetPasswordValues>({
        defaultValues: { password: '' },
        resolver: zodResolver(resetPasswordSchema),
    });
    const isBadTokenError = (error: unknown) =>
        error instanceof ApiError && error.message === 'RESET_PASSWORD_BAD_TOKEN';
    const verification = useMutation({
        mutationFn: (resetToken: string) => {
            if (!resetToken) {
                return api('/api/v1/auth/reset-password/setup');
            }

            return api('/api/v1/auth/reset-password/verify', { json: { token: resetToken }, method: 'POST' });
        },
        onSuccess: () => {
            sessionStorage.removeItem(PASSWORD_RESET_TOKEN_KEY);
        },
        onError: (error) => {
            // Invalid credentials cannot become valid through another retry.
            if (isBadTokenError(error)) {
                sessionStorage.removeItem(PASSWORD_RESET_TOKEN_KEY);
            }
        },
    });
    const resetPassword = useMutation({
        mutationFn: (payload: ResetPasswordValues) =>
            api('/api/v1/auth/reset-password', { json: payload, method: 'POST' }),
    });
    const verifyToken = useEffectEvent((value: string) => verification.mutate(value));
    const hasTokenError = isBadTokenError(verification.error) || isBadTokenError(resetPassword.error);

    /** Saves the new password while keeping invalid-token failures inline. */
    async function handleResetPassword(payload: ResetPasswordValues) {
        try {
            await resetPassword.mutateAsync(payload);
        } catch (error) {
            // The bad-token response blocks this workflow and is rendered below.
            if (isBadTokenError(error)) {
                return;
            }

            showToast({
                body: error instanceof Error ? error.message : 'Please try again in a moment.',
                type: 'error',
            });
        }
    }

    useEffect(() => {
        verifyToken(token);
    }, [token]);

    // Invalid and expired credentials require a replacement email.
    if (hasTokenError) {
        return (
            <AuthLayout
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
            </AuthLayout>
        );
    }

    // Keep transient exchange failures retryable without exposing the credential again.
    if (verification.error) {
        return (
            <AuthLayout title="Set a new password" description="Please try again in a moment.">
                <Button label="Retry" onClick={() => verification.mutate(token)} variant="primary" />
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title="Set a new password" description="Choose a new password for your LongLink account.">
            {!verification.isSuccess ? (
                <Button isLoading label="Reset password" variant="primary" />
            ) : resetPassword.isSuccess ? (
                <Stack gap={4}>
                    <Banner status="success" title="Your password has been reset. You can now sign in." />
                    <Button href="/login" label="Back to sign in" variant="primary" />
                </Stack>
            ) : (
                <Stack as="form" gap={4} onSubmit={form.handleSubmit(handleResetPassword)}>
                    <Controller
                        control={form.control}
                        name="password"
                        render={({ field, fieldState }) => (
                            <TextInput
                                ref={field.ref}
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
                                type="password"
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
        </AuthLayout>
    );
}
