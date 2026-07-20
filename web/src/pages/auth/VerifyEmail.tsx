import { z } from 'zod';
import { useEffect, useRef } from 'react';
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

type VerifyEmailValues = {
    email: string;
};

/** Verifies an emailed token and supports requesting a replacement verification email. */
export default function VerifyEmail() {
    const { t } = useTranslation();
    const location = useLocation();
    const search = new URLSearchParams(location.search);
    const token = search.get('token');
    const email = search.get('email') ?? '';
    const wasSent = search.get('sent') === 'true';
    const nextPath = sanitizeRedirectPath(search.get('next'));
    const nextQuery = new URLSearchParams({ next: nextPath }).toString();
    const requestedToken = useRef<string | null>(null);
    const schema = z.object({
        email: z.string().trim().min(1, t('auth.emailRequired')).email(t('auth.emailInvalid')),
    });
    const form = useForm<VerifyEmailValues>({
        defaultValues: { email },
        resolver: zodResolver(schema),
    });
    const verification = useMutation({
        mutationFn: async (verificationToken: string) => {
            await fetchApiVoid('/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: verificationToken }),
            });
        },
    });
    const requestVerification = useMutation({
        mutationFn: async (payload: VerifyEmailValues) => {
            await fetchApiVoid('/auth/request-verify-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        },
    });
    const verifyToken = verification.mutate;

    useEffect(() => {
        // Submit each URL token once, including under React Strict Mode.
        if (!token || requestedToken.current === token) {
            return;
        }

        requestedToken.current = token;
        verifyToken(token);
    }, [token, verifyToken]);

    const showRequestForm = !token || verification.isError;
    let statusMessage = wasSent ? t('auth.verificationEmailSent') : t('auth.verifyEmailDescription');

    // Token processing takes precedence over the informational resend state.
    if (token && verification.isPending) {
        statusMessage = t('auth.verifyingEmail');
    } else if (verification.isSuccess) {
        statusMessage = t('auth.emailVerified');
    }

    return (
        <AuthPage title={t('auth.verifyEmailTitle')} description={statusMessage}>
            {verification.error ? (
                <p role="alert" className="text-sm text-destructive">
                    {verification.error.message}
                </p>
            ) : null}

            {showRequestForm ? (
                <form
                    className="space-y-4"
                    onSubmit={form.handleSubmit((payload) => requestVerification.mutate(payload))}
                >
                    <div className="space-y-2">
                        <Label htmlFor="verify-email">{t('labels.email')}</Label>
                        <Input
                            id="verify-email"
                            type="email"
                            autoComplete="email"
                            aria-invalid={Boolean(form.formState.errors.email)}
                            {...form.register('email')}
                        />
                        {form.formState.errors.email ? (
                            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                        ) : null}
                    </div>
                    {requestVerification.isSuccess ? (
                        <p role="status" className="text-sm text-muted-foreground">
                            {t('auth.verificationEmailSent')}
                        </p>
                    ) : null}
                    {requestVerification.error ? (
                        <p role="alert" className="text-sm text-destructive">
                            {requestVerification.error.message}
                        </p>
                    ) : null}
                    <Button type="submit" variant="outline" className="w-full" disabled={requestVerification.isPending}>
                        {requestVerification.isPending
                            ? t('auth.sendingVerificationEmail')
                            : t('auth.resendVerificationEmail')}
                    </Button>
                </form>
            ) : null}

            {verification.isSuccess || verification.isError || !token ? (
                <Button render={<Link to={`/organizations?${nextQuery}`} />} className="w-full">
                    {t('auth.backToSignIn')}
                </Button>
            ) : null}
        </AuthPage>
    );
}
