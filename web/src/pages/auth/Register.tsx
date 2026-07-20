import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router';
import { fetchApiVoid } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuthConfig } from '@/hooks/use-auth';
import { AuthPage } from '@/components/AuthPage';
import { sanitizeRedirectPath } from '@/lib/redirects';

type RegisterValues = {
    name: string;
    email: string;
    password: string;
};

/** Renders account registration when local registration is enabled. */
export default function Register() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const authConfig = useAuthConfig();
    const nextPath = sanitizeRedirectPath(new URLSearchParams(location.search).get('next'));
    const nextQuery = new URLSearchParams({ next: nextPath }).toString();
    const schema = z.object({
        name: z.string().trim().min(1, t('auth.nameRequired')),
        email: z.string().trim().min(1, t('auth.emailRequired')).email(t('auth.emailInvalid')),
        password: z.string().min(12, t('auth.passwordTooShort')),
    });
    const form = useForm<RegisterValues>({
        defaultValues: { name: '', email: '', password: '' },
        resolver: zodResolver(schema),
    });
    const registration = useMutation({
        mutationFn: async (payload: RegisterValues) => {
            await fetchApiVoid('/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        },
    });

    /** Registers the account and opens the verification-email status page. */
    async function handleRegister(payload: RegisterValues) {
        try {
            await registration.mutateAsync(payload);
            const verificationQuery = new URLSearchParams({ email: payload.email, next: nextPath, sent: 'true' });

            navigate(`/auth/verify-email?${verificationQuery.toString()}`, { replace: true });
        } catch {
            // The mutation exposes its normalized API error below the form.
        }
    }

    // Wait for configuration before exposing the registration form.
    if (authConfig.isLoading) {
        return (
            <AuthPage title={t('auth.createAccount')} description={t('auth.registerDescription')}>
                <p role="status" className="text-center text-sm text-muted-foreground">
                    {t('auth.loadingAuthentication')}
                </p>
            </AuthPage>
        );
    }

    // Explain unavailable registration instead of rendering a form that cannot succeed.
    if (authConfig.error || !authConfig.data?.registration_enabled) {
        return (
            <AuthPage
                title={t('auth.registrationUnavailable')}
                description={t('auth.registrationUnavailableDescription')}
            >
                <Button render={<Link to={`/organizations?${nextQuery}`} />} variant="outline" className="w-full">
                    {t('auth.backToSignIn')}
                </Button>
            </AuthPage>
        );
    }

    return (
        <AuthPage title={t('auth.createAccount')} description={t('auth.registerDescription')}>
            <form className="space-y-4" onSubmit={form.handleSubmit(handleRegister)}>
                <div className="space-y-2">
                    <Label htmlFor="register-name">{t('labels.name')}</Label>
                    <Input
                        id="register-name"
                        autoComplete="name"
                        aria-invalid={Boolean(form.formState.errors.name)}
                        {...form.register('name')}
                    />
                    {form.formState.errors.name ? (
                        <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                    ) : null}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="register-email">{t('labels.email')}</Label>
                    <Input
                        id="register-email"
                        type="email"
                        autoComplete="email"
                        aria-invalid={Boolean(form.formState.errors.email)}
                        {...form.register('email')}
                    />
                    {form.formState.errors.email ? (
                        <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                    ) : null}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="register-password">{t('labels.password')}</Label>
                    <Input
                        id="register-password"
                        type="password"
                        autoComplete="new-password"
                        aria-invalid={Boolean(form.formState.errors.password)}
                        {...form.register('password')}
                    />
                    {form.formState.errors.password ? (
                        <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                    ) : null}
                </div>
                {registration.error ? (
                    <p role="alert" className="text-sm text-destructive">
                        {registration.error.message}
                    </p>
                ) : null}
                <Button type="submit" className="w-full" disabled={registration.isPending}>
                    {registration.isPending ? t('auth.creatingAccount') : t('auth.createAccount')}
                </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground">
                {t('auth.haveAccount')}{' '}
                <Link
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                    to={`/organizations?${nextQuery}`}
                >
                    {t('actions.login')}
                </Link>
            </p>
        </AuthPage>
    );
}
