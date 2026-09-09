import { z } from 'zod';
import { api, ApiError } from '@/lib/api';
import { NoIndex } from '@/components/Seo';
import { passwordSchema } from './validation';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { AuthForm, AuthLayout } from './AuthLayout';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useEffect, useEffectEvent, useRef } from 'react';
import { useFragmentToken } from '@/lib/hooks/use-fragment-token';

const PASSWORD_RESET_TOKEN_KEY = 'longlink.password-reset.token';
const resetPasswordSchema = z.object({
    password: passwordSchema,
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

type VerificationRequest = {
    signal: AbortSignal;
    token: string;
};

/** Returns whether an API error reports an invalid or expired reset token. */
function isBadTokenError(error: unknown): boolean {
    return error instanceof ApiError && error.status === 400;
}

/** Accepts a password reset token and saves a new password. */
export default function ResetPassword() {
    const token = useFragmentToken(PASSWORD_RESET_TOKEN_KEY);
    const verificationController = useRef<AbortController | null>(null);
    const form = useForm<ResetPasswordValues>({
        defaultValues: { password: '' },
        resolver: zodResolver(resetPasswordSchema),
    });
    const verification = useMutation({
        mutationFn: ({ signal, token: resetToken }: VerificationRequest) => {
            if (!resetToken) {
                return api('/api/v1/auth/reset-password/setup', { signal });
            }

            return api('/api/v1/auth/reset-password/verify', {
                json: { token: resetToken },
                method: 'POST',
                signal,
            });
        },
        onSuccess: (_data, variables) => {
            // Ignore a request replaced by a newer verification attempt.
            if (variables.signal === verificationController.current?.signal) {
                sessionStorage.removeItem(PASSWORD_RESET_TOKEN_KEY);
            }
        },
        onError: (error, variables) => {
            // Invalid credentials cannot become valid through another retry.
            if (variables.signal === verificationController.current?.signal && isBadTokenError(error)) {
                sessionStorage.removeItem(PASSWORD_RESET_TOKEN_KEY);
            }
        },
    });
    const resetPassword = useMutation({
        mutationFn: (payload: ResetPasswordValues) =>
            api('/api/v1/auth/reset-password', { json: payload, method: 'POST' }),
    });
    const hasTokenError = isBadTokenError(verification.error) || isBadTokenError(resetPassword.error);

    /** Replaces the active credential exchange with a cancellable request. */
    function startVerification(verificationToken: string) {
        verificationController.current?.abort();
        const controller = new AbortController();
        verificationController.current = controller;
        verification.mutate({ signal: controller.signal, token: verificationToken });
    }

    const startInitialVerification = useEffectEvent(startVerification);

    useEffect(() => {
        startInitialVerification(token);

        return () => {
            const controller = verificationController.current;
            verificationController.current = null;
            controller?.abort();
        };
    }, [token]);

    const pageMetadata = <NoIndex title="Set a New Password | LongLink" />;

    // Invalid and expired credentials require a replacement email.
    if (hasTokenError) {
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

    // Keep transient exchange failures retryable without exposing the credential again.
    if (verification.error) {
        return (
            <AuthLayout title="Set a new password" description="Please try again in a moment.">
                {pageMetadata}
                <Button label="Retry" onClick={() => startVerification(token)} variant="primary" />
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title="Set a new password" description="Choose a new password for your LongLink account.">
            {pageMetadata}
            {!verification.isSuccess ? (
                <Button isLoading label="Reset password" variant="primary" />
            ) : resetPassword.isSuccess ? (
                <Stack gap={4}>
                    <Banner status="success" title="Your password has been reset. You can now sign in." />
                    <Button href="/login" label="Back to sign in" variant="primary" />
                </Stack>
            ) : (
                <AuthForm
                    gap={4}
                    onSubmit={form.handleSubmit(async (payload) => {
                        // Await completion while the mutation cache reports failures.
                        await resetPassword.mutateAsync(payload).catch(() => {});
                    })}
                >
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
                        label="Reset password"
                        type="submit"
                        variant="primary"
                    />
                </AuthForm>
            )}
        </AuthLayout>
    );
}
