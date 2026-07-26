import { Avatar } from '@astryxdesign/core/Avatar';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Link } from '@astryxdesign/core/Link';
import { List, ListItem } from '@astryxdesign/core/List';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { PasswordInput } from '@/components/PasswordInput';
import { Wordmark } from '@/components/Wordmark';
import { useToast } from '@/hooks/use-toast';
import { useSavedAccounts } from '@/hooks/use-user';
import { fetchApiVoid } from '@/lib/api';
import { userProfileQueryKey } from '@/lib/query-keys';
import { sanitizeRedirectPath } from '@/lib/redirects';

type LoginValues = {
    email: string;
    password: string;
};

/** Renders the shared LongLink sign-in form and saved account selector. */
export function SignInCard({ redirectTo, initialEmail = '' }: { redirectTo: string; initialEmail?: string }) {
    const t = useTranslator();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const accounts = useSavedAccounts();
    const showToast = useToast();
    const safeRedirectTo = sanitizeRedirectPath(redirectTo);
    const loginSchema = z.object({
        email: z.string().trim().min(1, t('auth.emailRequired')).email(t('auth.emailInvalid')),
        password: z.string().min(1, t('auth.passwordRequired')).max(1024, t('auth.passwordTooLong')),
    });
    const form = useForm<LoginValues>({
        defaultValues: { email: initialEmail, password: '' },
        resolver: zodResolver(loginSchema),
    });
    const email = useWatch({ control: form.control, name: 'email' }).trim();
    const nextQuery = new URLSearchParams({ next: safeRedirectTo }).toString();
    const registerQuery = new URLSearchParams({ next: safeRedirectTo, ...(email ? { email } : {}) }).toString();
    const login = useMutation({
        mutationFn: (payload: LoginValues) =>
            fetchApiVoid('/api/auth/password/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }),
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
            await queryClient.invalidateQueries({ queryKey: userProfileQueryKey() });
            navigate(safeRedirectTo, { replace: true });
        } catch (loginError) {
            showToast({
                body: loginError instanceof Error ? loginError.message : t('auth.loginFailed'),
                type: 'error',
            });
        }
    }

    const hasSavedAccounts = accounts.items.length > 0;
    const isPending = login.isPending;

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
                                startContent={<Avatar src={account.avatar} name={account.name} size="md" />}
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
                            isRequired
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
                                isRequired
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
