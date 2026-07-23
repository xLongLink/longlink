import { z } from 'zod';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Button } from '@astryxdesign/core/Button';
import { useToast } from '@astryxdesign/core/Toast';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslator } from '@astryxdesign/core/i18n';
import { List, ListItem } from '@astryxdesign/core/List';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GitHub } from '@/svg/GitHub';
import { useAuthConfig } from '@/hooks/use-auth';
import { Wordmark } from '@/components/Wordmark';
import { useSavedAccounts } from '@/hooks/use-user';
import { fetchApiJson, fetchApiVoid } from '@/lib/api';
import { PasswordInput } from '@/components/PasswordInput';
import { accountsQueryKey, userProfileQueryKey } from '@/lib/query-keys';
import { apiAuthorizationSchema, parseApiResponse } from '@/lib/api-schemas';
import { AUTH_RETURN_PATH_KEY, sanitizeRedirectPath } from '@/lib/redirects';

type LoginValues = {
    email: string;
    password: string;
};

type AuthProvider = 'github';

/** Renders the shared LongLink sign-in form and saved account selector. */
export function SignInCard({ redirectTo, initialEmail = '' }: { redirectTo: string; initialEmail?: string }) {
    const t = useTranslator();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const accounts = useSavedAccounts();
    const { data: authConfig } = useAuthConfig();
    const showToast = useToast();
    const [pendingProvider, setPendingProvider] = useState<AuthProvider | null>(null);
    const safeRedirectTo = sanitizeRedirectPath(redirectTo);
    const loginSchema = z.object({
        email: z.string().trim().min(1, t('auth.emailRequired')).email(t('auth.emailInvalid')),
        password: z.string().min(1, t('auth.passwordRequired')),
    });
    const form = useForm<LoginValues>({
        defaultValues: { email: initialEmail, password: '' },
        resolver: zodResolver(loginSchema),
    });
    const email = useWatch({ control: form.control, name: 'email' }).trim();
    const nextQuery = new URLSearchParams({ next: safeRedirectTo }).toString();
    const registerQuery = new URLSearchParams({ next: safeRedirectTo, ...(email ? { email } : {}) }).toString();
    const login = useMutation({
        mutationFn: async (payload: LoginValues) => {
            const body = new URLSearchParams({ username: payload.email, password: payload.password });

            await fetchApiVoid('/api/auth/password/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body,
            });
        },
    });

    /** Prefills a saved account while requiring normal password authentication. */
    function handleAccountSelect(email: string) {
        form.reset({ email, password: '' });
        form.setFocus('password');
    }

    /** Signs in with an email and password, then refreshes the current profile. */
    async function handlePasswordSignIn(payload: LoginValues) {
        try {
            await login.mutateAsync(payload);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: userProfileQueryKey() }),
                queryClient.invalidateQueries({ queryKey: accountsQueryKey() }),
            ]);
            navigate(safeRedirectTo, { replace: true });
        } catch (loginError) {
            showToast({
                body: loginError instanceof Error ? loginError.message : t('auth.loginFailed'),
                type: 'error',
            });
        }
    }

    /** Requests an external authorization URL and preserves the safe return path. */
    async function handleProviderSignIn(provider: AuthProvider) {
        setPendingProvider(provider);

        try {
            const authorization = await fetchApiJson(`/api/auth/${provider}/authorize`, undefined, (value) =>
                parseApiResponse(apiAuthorizationSchema, value)
            );

            sessionStorage.setItem(AUTH_RETURN_PATH_KEY, safeRedirectTo);
            window.location.assign(authorization.authorization_url);
        } catch {
            showToast({ body: t('auth.providerSignInFailed'), type: 'error' });
            setPendingProvider(null);
        }
    }

    const hasSavedAccounts = accounts.items.length > 0;
    const hasProviders = authConfig?.github_enabled;
    const isPending = login.isPending || pendingProvider !== null;

    return (
        <Stack gap={4} maxWidth={384} width="100%">
            <Stack gap={1} hAlign="center">
                <Heading level={1} justify="center">
                    <span className="inline-flex flex-wrap items-baseline justify-center gap-2">
                        <span>{t('auth.welcomeTo')}</span>
                        <Wordmark size="heading" />
                    </span>
                </Heading>
                <Divider label={t('auth.signInDescription')} />
            </Stack>

            {hasSavedAccounts ? (
                <Stack gap={2}>
                    <List
                        density="compact"
                        header={
                            <Text type="label" color="secondary">
                                {t('auth.savedAccounts')}
                            </Text>
                        }
                    >
                        {accounts.items.map((account) => (
                            <ListItem
                                key={account.id}
                                description={account.email}
                                isDisabled={isPending}
                                label={account.name}
                                onClick={() => handleAccountSelect(account.email)}
                                startContent={<Avatar src={account.avatar} name={account.name} size="small" />}
                            />
                        ))}
                    </List>
                    <Divider label={t('auth.orUseAnotherAccount')} />
                </Stack>
            ) : null}

            <Stack as="form" gap={3} onSubmit={form.handleSubmit(handlePasswordSignIn)}>
                <Controller
                    control={form.control}
                    name="email"
                    render={({ field, fieldState }) => (
                        <TextInput
                            ref={field.ref}
                            htmlName={field.name}
                            label={t('labels.email')}
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                            type="email"
                            value={field.value}
                            width="100%"
                        />
                    )}
                />
                <Stack gap={1}>
                    <Stack direction="horizontal" hAlign="between" vAlign="center">
                        <Text type="label">{t('labels.password')}</Text>
                        <Link href={`/auth/forgot-password?${nextQuery}`} type="supporting">
                            {t('auth.forgotPassword')}
                        </Link>
                    </Stack>
                    <Controller
                        control={form.control}
                        name="password"
                        render={({ field, fieldState }) => (
                            <PasswordInput
                                ref={field.ref}
                                autoComplete="current-password"
                                htmlName={field.name}
                                isLabelHidden
                                label={t('labels.password')}
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
                </Stack>
                <Button
                    isDisabled={isPending}
                    isLoading={login.isPending}
                    label={login.isPending ? t('auth.signingIn') : t('actions.login')}
                    type="submit"
                    variant="primary"
                    width="100%"
                />
            </Stack>

            {hasProviders ? (
                <Stack gap={3}>
                    <Divider label={t('auth.orContinueWith')} />
                    <Stack direction="horizontal" gap={2} wrap="wrap">
                        {authConfig.github_enabled ? (
                            <Button
                                icon={<GitHub aria-hidden="true" className="size-4" />}
                                isDisabled={isPending}
                                label={t('auth.github')}
                                onClick={() => void handleProviderSignIn('github')}
                                variant="secondary"
                            />
                        ) : null}
                    </Stack>
                </Stack>
            ) : null}

            <Divider
                label={
                    <>
                        {t('auth.noAccount')}{' '}
                        <Link href={`/auth/register?${registerQuery}`} type="inherit" weight="medium">
                            {t('auth.createAccount')}
                        </Link>
                    </>
                }
            />

            <Text as="p" color="secondary" justify="center" type="supporting">
                {t('auth.agreementLead')} <br />
                <Link href="/terms" hasUnderline type="inherit">
                    {t('auth.termsOfService')}
                </Link>{' '}
                {t('auth.agreementMiddle')}{' '}
                <Link href="/privacy" hasUnderline type="inherit">
                    {t('auth.privacyPolicy')}
                </Link>
                .
            </Text>
        </Stack>
    );
}
