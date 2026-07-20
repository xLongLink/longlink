import { z } from 'zod';
import { useLocation } from 'react-router';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fetchApiVoid } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { AuthPage } from '@/components/AuthPage';
import { sanitizeRedirectPath } from '@/lib/redirects';
import { PasswordInput } from '@/components/PasswordInput';

type ResetPasswordValues = {
    password: string;
};

/** Accepts a password reset token and saves a new password. */
export default function ResetPassword() {
    const { t } = useTranslation();
    const location = useLocation();
    const search = new URLSearchParams(location.search);
    const token = search.get('token');
    const nextPath = sanitizeRedirectPath(search.get('next'));
    const nextQuery = new URLSearchParams({ next: nextPath }).toString();
    const schema = z.object({
        password: z.string().min(12, t('auth.passwordTooShort')),
    });
    const form = useForm<ResetPasswordValues>({
        defaultValues: { password: '' },
        resolver: zodResolver(schema),
    });
    const resetPassword = useMutation({
        mutationFn: async (payload: ResetPasswordValues) => {
            await fetchApiVoid('/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password: payload.password }),
            });
        },
    });

    // A reset request cannot proceed without the emailed token.
    if (!token) {
        return (
            <AuthPage title={t('auth.resetPasswordTitle')} description={t('auth.invalidResetLink')}>
                <Button
                    href={`/auth/forgot-password?${nextQuery}`}
                    label={t('auth.requestAnotherReset')}
                    variant="primary"
                />
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
                <Stack as="form" gap={4} onSubmit={form.handleSubmit((payload) => resetPassword.mutate(payload))}>
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
                    {resetPassword.error ? <Banner status="error" title={resetPassword.error.message} /> : null}
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
