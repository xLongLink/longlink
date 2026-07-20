import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { fetchApiVoid } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AuthPage } from '@/components/AuthPage';
import { sanitizeRedirectPath } from '@/lib/redirects';

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
                <Button render={<Link to={`/auth/forgot-password?${nextQuery}`} />} className="w-full">
                    {t('auth.requestAnotherReset')}
                </Button>
            </AuthPage>
        );
    }

    return (
        <AuthPage title={t('auth.resetPasswordTitle')} description={t('auth.resetPasswordDescription')}>
            {resetPassword.isSuccess ? (
                <div className="space-y-4">
                    <p role="status" className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
                        {t('auth.passwordReset')}
                    </p>
                    <Button render={<Link to={`/organizations?${nextQuery}`} />} className="w-full">
                        {t('auth.backToSignIn')}
                    </Button>
                </div>
            ) : (
                <form className="space-y-4" onSubmit={form.handleSubmit((payload) => resetPassword.mutate(payload))}>
                    <div className="space-y-2">
                        <Label htmlFor="reset-password">{t('auth.newPassword')}</Label>
                        <Input
                            id="reset-password"
                            type="password"
                            autoComplete="new-password"
                            aria-invalid={Boolean(form.formState.errors.password)}
                            {...form.register('password')}
                        />
                        {form.formState.errors.password ? (
                            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                        ) : null}
                    </div>
                    {resetPassword.error ? (
                        <p role="alert" className="text-sm text-destructive">
                            {resetPassword.error.message}
                        </p>
                    ) : null}
                    <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
                        {resetPassword.isPending ? t('auth.resettingPassword') : t('auth.resetPassword')}
                    </Button>
                </form>
            )}
        </AuthPage>
    );
}
