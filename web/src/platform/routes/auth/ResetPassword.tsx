import { z } from 'zod';
import { api, ApiError } from '@/lib/api';
import { useEffect, useRef } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { AuthForm, AuthLayout } from './AuthLayout';
import { useMutation } from '@tanstack/react-query';
import { TextInput } from '@astryxdesign/core/TextInput';
import { fieldErrorStatus, passwordSchema } from './validation';
import { revalidateLogic, useForm } from '@tanstack/react-form';
import { useFragmentToken } from '@/lib/hooks/use-fragment-token';

const PASSWORD_RESET_TOKEN_KEY = 'longlink.password-reset.token';
const resetPasswordSchema = z.object({
    password: passwordSchema,
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/** Returns whether an API error reports an invalid or expired reset token. */
function isBadTokenError(error: unknown): boolean {
    return error instanceof ApiError && error.status === 400;
}

/** Accepts a password reset token and saves a new password. */
export default function ResetPassword() {
    const showToast = useToast();
    const token = useFragmentToken(PASSWORD_RESET_TOKEN_KEY);
    const verificationController = useRef<AbortController | null>(null);
    const form = useForm({
        defaultValues: { password: '' },
        validationLogic: revalidateLogic(),
        validators: { onDynamic: resetPasswordSchema },
        onSubmit: ({ value }) => handleResetPassword(value),
    });
    const verification = useMutation({
        mutationFn: ({ signal, token: resetToken }: { signal: AbortSignal; token: string }) => {
            if (!resetToken) {
                return api('/api/v1/auth/reset-password/setup', { signal });
            }

            return api('/api/v1/auth/reset-password/verify', {
                json: { token: resetToken },
                method: 'POST',
                signal,
            });
        },
        onSuccess: () => sessionStorage.removeItem(PASSWORD_RESET_TOKEN_KEY),
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
    const { mutate: verifyToken } = verification;
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
        verificationController.current?.abort();
        const controller = new AbortController();
        verificationController.current = controller;
        verifyToken({ signal: controller.signal, token });

        return () => {
            verificationController.current?.abort();
            verificationController.current = null;
        };
    }, [token, verifyToken]);

    // Invalid and expired credentials require a replacement email.
    if (hasTokenError) {
        return (
            <AuthLayout
                title="Set a new password"
                description="This password reset link is invalid or expired. Request a new link to continue."
            >
                <Button href="/auth/forgot-password" label="Request another reset link" variant="primary" />
            </AuthLayout>
        );
    }

    // Keep transient exchange failures retryable without exposing the credential again.
    if (verification.error) {
        return (
            <AuthLayout title="Set a new password" description="Please try again in a moment.">
                <Button
                    label="Retry"
                    onClick={() => {
                        verificationController.current?.abort();
                        const controller = new AbortController();
                        verificationController.current = controller;
                        verification.mutate({ signal: controller.signal, token });
                    }}
                    variant="primary"
                />
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
                <AuthForm gap={4} onSubmit={form.handleSubmit}>
                    <form.Field
                        name="password"
                        children={(field) => (
                            <TextInput
                                htmlName="password"
                                isRequired
                                label="New password"
                                onBlur={field.handleBlur}
                                onChange={field.handleChange}
                                status={fieldErrorStatus(field.state.meta.errors)}
                                value={field.state.value}
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
