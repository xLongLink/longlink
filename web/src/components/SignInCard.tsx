import { z } from 'zod';
import { toast } from 'sonner';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Github, KeyRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getInitials } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useTranslation } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuthConfig } from '@/hooks/use-auth';
import { Wordmark } from '@/components/Wordmark';
import { Separator } from '@/components/ui/separator';
import { fetchApiJson, fetchApiVoid } from '@/lib/api';
import { accountsQueryKey, userProfileQueryKey } from '@/lib/query-keys';
import { apiAuthorizationSchema, parseApiResponse } from '@/lib/api-schemas';
import { AUTH_RETURN_PATH_KEY, sanitizeRedirectPath } from '@/lib/redirects';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type LoginValues = {
    email: string;
    password: string;
};

type AuthProvider = 'github' | 'oidc';

/** Renders the shared LongLink sign-in form and saved account switcher. */
export function SignInCard({ redirectTo }: { redirectTo: string }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { accounts, activateAccount } = useUser();
    const { data: authConfig } = useAuthConfig();
    const [error, setError] = useState<string | null>(null);
    const [pendingProvider, setPendingProvider] = useState<AuthProvider | null>(null);
    const safeRedirectTo = sanitizeRedirectPath(redirectTo);
    const nextQuery = new URLSearchParams({ next: safeRedirectTo }).toString();
    const loginSchema = z.object({
        email: z.string().trim().min(1, t('auth.emailRequired')).email(t('auth.emailInvalid')),
        password: z.string().min(1, t('auth.passwordRequired')),
    });
    const form = useForm<LoginValues>({
        defaultValues: { email: '', password: '' },
        resolver: zodResolver(loginSchema),
    });
    const login = useMutation({
        mutationFn: async (payload: LoginValues) => {
            const body = new URLSearchParams({ username: payload.email, password: payload.password });

            await fetchApiVoid('/auth/password/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body,
            });
        },
    });

    /** Activates one saved account and returns to the requested page. */
    async function handleAccountSelect(id: string) {
        // Activate the saved account before redirecting.
        try {
            await activateAccount(id);
            navigate(safeRedirectTo, { replace: true });
        } catch (accountError) {
            toast.error(accountError instanceof Error ? accountError.message : t('auth.accountOpenFailed'));
        }
    }

    /** Signs in with an email and password, then refreshes the current profile. */
    async function handlePasswordSignIn(payload: LoginValues) {
        setError(null);

        try {
            await login.mutateAsync(payload);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: userProfileQueryKey() }),
                queryClient.invalidateQueries({ queryKey: accountsQueryKey() }),
            ]);
            navigate(safeRedirectTo, { replace: true });
        } catch (loginError) {
            setError(loginError instanceof Error ? loginError.message : t('auth.loginFailed'));
        }
    }

    /** Requests an external authorization URL and preserves the safe return path. */
    async function handleProviderSignIn(provider: AuthProvider) {
        setError(null);
        setPendingProvider(provider);

        try {
            const authorization = await fetchApiJson(`/auth/${provider}/authorize`, undefined, (value) =>
                parseApiResponse(apiAuthorizationSchema, value)
            );

            sessionStorage.setItem(AUTH_RETURN_PATH_KEY, safeRedirectTo);
            window.location.assign(authorization.authorization_url);
        } catch {
            setError(t('auth.providerSignInFailed'));
            setPendingProvider(null);
        }
    }

    const hasSavedAccounts = accounts.items.length > 0;
    const hasProviders = authConfig?.github_enabled || authConfig?.oidc_enabled;
    const isPending = login.isPending || pendingProvider !== null;

    return (
        <div className="mx-auto w-full max-w-sm">
            <div className="space-y-5">
                <div className="space-y-2 text-center">
                    <h1 className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-2xl font-medium">
                        <span>{t('auth.welcomeTo')}</span>
                        <Wordmark className="text-2xl align-baseline" />
                    </h1>
                    <p className="text-sm text-muted-foreground">{t('auth.signInDescription')}</p>
                </div>

                {hasSavedAccounts ? (
                    <div className="space-y-2">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {t('auth.savedAccounts')}
                        </p>
                        {accounts.items.map((account) => (
                            <button
                                key={account.id}
                                type="button"
                                disabled={isPending}
                                className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-border/70 px-3 py-2 text-left transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
                                onClick={() => void handleAccountSelect(account.id)}
                            >
                                <Avatar className="size-9">
                                    <AvatarImage src={account.avatar} alt={account.name} />
                                    <AvatarFallback>{getInitials(account.name)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-foreground">{account.name}</p>
                                    <p className="truncate text-xs text-muted-foreground">{account.email}</p>
                                </div>
                            </button>
                        ))}
                        <div className="flex items-center gap-3 py-1">
                            <Separator className="flex-1" />
                            <span className="text-xs text-muted-foreground">{t('auth.orUseAnotherAccount')}</span>
                            <Separator className="flex-1" />
                        </div>
                    </div>
                ) : null}

                <form className="space-y-4" onSubmit={form.handleSubmit(handlePasswordSignIn)}>
                    <div className="space-y-2">
                        <Label htmlFor="sign-in-email">{t('labels.email')}</Label>
                        <Input
                            id="sign-in-email"
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
                        <div className="flex items-center justify-between gap-4">
                            <Label htmlFor="sign-in-password">{t('labels.password')}</Label>
                            <Link
                                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                                to={`/auth/forgot-password?${nextQuery}`}
                            >
                                {t('auth.forgotPassword')}
                            </Link>
                        </div>
                        <Input
                            id="sign-in-password"
                            type="password"
                            autoComplete="current-password"
                            aria-invalid={Boolean(form.formState.errors.password)}
                            {...form.register('password')}
                        />
                        {form.formState.errors.password ? (
                            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                        ) : null}
                    </div>
                    {error ? (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    ) : null}
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {login.isPending ? t('auth.signingIn') : t('actions.login')}
                    </Button>
                </form>

                {hasProviders ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Separator className="flex-1" />
                            <span className="text-xs text-muted-foreground">{t('auth.orContinueWith')}</span>
                            <Separator className="flex-1" />
                        </div>
                        <div
                            className={
                                authConfig.github_enabled && authConfig.oidc_enabled
                                    ? 'grid gap-2 sm:grid-cols-2'
                                    : 'grid gap-2'
                            }
                        >
                            {authConfig.github_enabled ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isPending}
                                    onClick={() => void handleProviderSignIn('github')}
                                >
                                    <Github />
                                    {t('auth.github')}
                                </Button>
                            ) : null}
                            {authConfig.oidc_enabled ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isPending}
                                    onClick={() => void handleProviderSignIn('oidc')}
                                >
                                    <KeyRound />
                                    {t('auth.singleSignOn')}
                                </Button>
                            ) : null}
                        </div>
                    </div>
                ) : null}

                {authConfig?.registration_enabled ? (
                    <p className="text-center text-sm text-muted-foreground">
                        {t('auth.noAccount')}{' '}
                        <Link
                            className="font-medium text-foreground underline-offset-4 hover:underline"
                            to={`/auth/register?${nextQuery}`}
                        >
                            {t('auth.createAccount')}
                        </Link>
                    </p>
                ) : null}
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
                <span>{t('auth.agreementLead')}</span>
                <br />
                <Link className="underline underline-offset-4 hover:text-foreground" to="/terms">
                    {t('auth.termsOfService')}
                </Link>{' '}
                {t('auth.agreementMiddle')}{' '}
                <Link className="underline underline-offset-4 hover:text-foreground" to="/privacy">
                    {t('auth.privacyPolicy')}
                </Link>
                .
            </p>
        </div>
    );
}
