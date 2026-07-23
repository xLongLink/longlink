import { z } from 'zod';
import { useLocation } from 'react-router';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { useToast } from '@astryxdesign/core/Toast';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslator } from '@astryxdesign/core/i18n';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AuthPage } from '@/components/AuthPage';
import { ApiError, fetchApiVoid } from '@/lib/api';
import { sanitizeRedirectPath } from '@/lib/redirects';
import { PasswordInput } from '@/components/PasswordInput';

type ResetPasswordValues = {
    password: string;
};

const PASSWORD_RESET_TOKEN_KEY = 'longlink.password-reset.token';

/** Accepts a password reset token and saves a new password. */
export default function ResetPassword() {
    const t = useTranslator();
    const showToast = useToast();
    const location = useLocation();
    const search = new URLSearchParams(location.search);
    const [fragmentToken] = useState(
        () => new URLSearchParams(location.hash.replace(/^#/, '')).get('token')?.trim() ?? ''
    );
    const [token] = useState(() => fragmentToken || sessionStorage.getItem(PASSWORD_RESET_TOKEN_KEY) || '');
    const verificationStarted = useRef(false);
    const nextPath = sanitizeRedirectPath(search.get('next'));
    const nextQuery = new URLSearchParams({ next: nextPath }).toString();
    const schema = z.object({
        password: z.string().min(12, t('auth.passwordTooShort')),
    });
    const form = useForm<ResetPasswordValues>({
        defaultValues: { password: '' },
        resolver: zodResolver(schema),
    });
    const verification = useMutation({
        mutationFn: async (resetToken: string) => {
            if (!resetToken) {
                await fetchApiVoid('/api/auth/reset-password/setup');
                return;
            }

            await fetchApiVoid('/api/auth/reset-password/verify', {
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
            await fetchApiVoid('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: payload.password }),
            });
        },
    });
    const tokenError =
        verification.error instanceof ApiError && verification.error.code === 'RESET_PASSWORD_BAD_TOKEN'
            ? verification.error
            : resetPassword.error instanceof ApiError && resetPassword.error.code === 'RESET_PASSWORD_BAD_TOKEN'
              ? resetPassword.error
              : null;
    const verifyToken = verification.mutate;

    /** Saves the new password while keeping invalid-token failures inline. */
    async function handleResetPassword(payload: ResetPasswordValues) {
        try {
            await resetPassword.mutateAsync(payload);
            sessionStorage.removeItem(PASSWORD_RESET_TOKEN_KEY);
        } catch (error) {
            // The bad-token response blocks this workflow and is rendered below.
            if (error instanceof ApiError && error.status === 400 && error.code === 'RESET_PASSWORD_BAD_TOKEN') {
                return;
            }

            // Keep server-side password policy failures with the password field.
            if (error instanceof ApiError && error.code === 'RESET_PASSWORD_INVALID_PASSWORD') {
                form.setError('password', { message: error.message, type: 'server' });
                return;
            }

            showToast({
                body: error instanceof Error ? error.message : t('appView.retryLater'),
                type: 'error',
            });
        }
    }

    useLayoutEffect(() => {
        // URL fragments do not reach the server; remove the credential before the page paints.
        if (fragmentToken) {
            sessionStorage.setItem(PASSWORD_RESET_TOKEN_KEY, fragmentToken);
            window.history.replaceState(window.history.state, '', `${location.pathname}${location.search}`);
        }
    }, [fragmentToken, location.pathname, location.search]);

    useEffect(() => {
        // Strict Mode may rerun effects, but credential exchange needs only one initial request.
        if (verificationStarted.current) {
            return;
        }

        verificationStarted.current = true;
        verifyToken(token);
    }, [token, verifyToken]);

    // Invalid and expired credentials require a replacement email.
    if (tokenError) {
        return (
            <AuthPage title={t('auth.resetPasswordTitle')} description={t('auth.invalidResetLink')}>
                <Stack gap={4}>
                    <Banner status="error" title={t('auth.invalidResetLink')} />
                    <Button
                        href={`/auth/forgot-password?${nextQuery}`}
                        label={t('auth.requestAnotherReset')}
                        variant="primary"
                    />
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
                <Button isDisabled isLoading label={t('auth.resetPassword')} variant="primary" />
            </AuthPage>
        );
    }

    return (
        <AuthPage title={t('auth.resetPasswordTitle')} description={t('auth.resetPasswordDescription')}>
            {resetPassword.isSuccess ? (
                <Stack gap={4}>
                    <Banner status="success" title={t('auth.passwordReset')} />
                    <Button href={`/organizations?${nextQuery}`} label={t('auth.backToSignIn')} variant="primary" />
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
                        isDisabled={resetPassword.isPending}
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
