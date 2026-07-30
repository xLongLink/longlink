import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Stack } from '@astryxdesign/core/Stack';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { AuthPage } from '@/components/AuthPage';
import { PasswordInput } from '@/components/PasswordInput';
import { useToast } from '@/hooks/use-toast';
import { ApiError, fetchApiVoid } from '@/lib/api';
import { useFragmentToken } from './use-fragment-token';

type ResetPasswordValues = {
    password: string;
};

const PASSWORD_RESET_TOKEN_KEY = 'longlink.password-reset.token';

/** Accepts a password reset token and saves a new password. */
export default function ResetPassword() {
    const t = useTranslator();
    const showToast = useToast();
    const token = useFragmentToken(PASSWORD_RESET_TOKEN_KEY);
    const verificationStarted = useRef(false);
    const schema = z.object({
        password: z.string().min(1, t('auth.passwordRequired')).max(1024, t('auth.passwordTooLong')),
    });
    const form = useForm<ResetPasswordValues>({
        defaultValues: { password: '' },
        resolver: zodResolver(schema),
    });
    const verification = useMutation({
        mutationFn: (resetToken: string) => {
            if (!resetToken) {
                return fetchApiVoid('/api/auth/reset-password/setup');
            }

            return fetchApiVoid('/api/auth/reset-password/verify', {
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
        mutationFn: (payload: ResetPasswordValues) =>
            fetchApiVoid('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }),
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
                body: error instanceof Error ? error.message : t('appView.retryLater'),
                type: 'error',
            });
        }
    }

    useEffect(() => {
        // Strict Mode may rerun effects, but credential exchange needs only one initial request.
        if (verificationStarted.current) {
            return;
        }

        verificationStarted.current = true;
        verification.mutate(token);

        // oxlint-disable-next-line react-hooks/exhaustive-deps -- React Query keeps the mutate callback stable.
    }, [token, verification.mutate]);

    // Invalid and expired credentials require a replacement email.
    if (hasTokenError) {
        return (
            <AuthPage title={t('auth.resetPasswordTitle')} description={t('auth.invalidResetLink')}>
                <Stack gap={4}>
                    <Banner status="error" title={t('auth.invalidResetLink')} />
                    <Button href="/auth/forgot-password" label={t('auth.requestAnotherReset')} variant="primary" />
                </Stack>
            </AuthPage>
        );
    }

    // Keep transient exchange failures retryable without exposing the credential again.
    if (verification.error) {
        return (
            <AuthPage title={t('auth.resetPasswordTitle')} description={t('appView.retryLater')}>
                <Button label={t('actions.retry')} onClick={() => verification.mutate(token)} variant="primary" />
            </AuthPage>
        );
    }

    // Do not collect a password until the server has moved reset proof into its restricted cookie.
    if (!verification.isSuccess) {
        return (
            <AuthPage title={t('auth.resetPasswordTitle')} description={t('auth.resetPasswordDescription')}>
                <Button isLoading label={t('auth.resetPassword')} variant="primary" />
            </AuthPage>
        );
    }

    return (
        <AuthPage title={t('auth.resetPasswordTitle')} description={t('auth.resetPasswordDescription')}>
            {resetPassword.isSuccess ? (
                <Stack gap={4}>
                    <Banner status="success" title={t('auth.passwordReset')} />
                    <Button href="/organizations" label={t('auth.backToSignIn')} variant="primary" />
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
                                label={t('auth.newPassword')}
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
                        label={resetPassword.isPending ? t('auth.resettingPassword') : t('auth.resetPassword')}
                        type="submit"
                        variant="primary"
                    />
                </Stack>
            )}
        </AuthPage>
    );
}
