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

type ForgotPasswordValues = {
    email: string;
};

/** Requests a password reset email without disclosing whether an account exists. */
export default function ForgotPassword() {
    const { t } = useTranslation();
    const location = useLocation();
    const nextPath = sanitizeRedirectPath(new URLSearchParams(location.search).get('next'));
    const nextQuery = new URLSearchParams({ next: nextPath }).toString();
    const schema = z.object({
        email: z.string().trim().min(1, t('auth.emailRequired')).email(t('auth.emailInvalid')),
    });
    const form = useForm<ForgotPasswordValues>({
        defaultValues: { email: '' },
        resolver: zodResolver(schema),
    });
    const requestReset = useMutation({
        mutationFn: async (payload: ForgotPasswordValues) => {
            await fetchApiVoid('/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        },
    });

    return (
        <AuthPage title={t('auth.forgotPasswordTitle')} description={t('auth.forgotPasswordDescription')}>
            {requestReset.isSuccess ? (
                <div className="space-y-4">
                    <p role="status" className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
                        {t('auth.resetEmailSent')}
                    </p>
                    <Button render={<Link to={`/organizations?${nextQuery}`} />} className="w-full">
                        {t('auth.backToSignIn')}
                    </Button>
                </div>
            ) : (
                <form className="space-y-4" onSubmit={form.handleSubmit((payload) => requestReset.mutate(payload))}>
                    <div className="space-y-2">
                        <Label htmlFor="forgot-password-email">{t('labels.email')}</Label>
                        <Input
                            id="forgot-password-email"
                            type="email"
                            autoComplete="email"
                            aria-invalid={Boolean(form.formState.errors.email)}
                            {...form.register('email')}
                        />
                        {form.formState.errors.email ? (
                            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                        ) : null}
                    </div>
                    {requestReset.error ? (
                        <p role="alert" className="text-sm text-destructive">
                            {requestReset.error.message}
                        </p>
                    ) : null}
                    <Button type="submit" className="w-full" disabled={requestReset.isPending}>
                        {requestReset.isPending ? t('auth.sendingResetEmail') : t('auth.sendResetEmail')}
                    </Button>
                </form>
            )}
            {!requestReset.isSuccess ? (
                <p className="text-center text-sm text-muted-foreground">
                    <Link
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                        to={`/organizations?${nextQuery}`}
                    >
                        {t('auth.backToSignIn')}
                    </Link>
                </p>
            ) : null}
        </AuthPage>
    );
}
