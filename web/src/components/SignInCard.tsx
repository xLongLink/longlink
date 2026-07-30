import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { AuthLegalAgreement } from '@/components/AuthLegalAgreement';
import { AuthWelcomeTitle } from '@/components/AuthWelcomeTitle';
import { PasswordInput } from '@/components/PasswordInput';
import { useToast } from '@/hooks/use-toast';
import { fetchApiVoid } from '@/lib/api';
import { userProfileQueryKey } from '@/lib/query-keys';

type LoginValues = {
    email: string;
    password: string;
};

/** Renders the shared LongLink sign-in form. */
export function SignInCard({ initialEmail = '' }: { initialEmail?: string }) {
    const t = useTranslator();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const showToast = useToast();
    const loginSchema = z.object({
        email: z.string().trim().min(1, t('auth.emailRequired')).email(t('auth.emailInvalid')),
        password: z.string().min(1, t('auth.passwordRequired')).max(1024, t('auth.passwordTooLong')),
    });
    const form = useForm<LoginValues>({
        defaultValues: { email: initialEmail, password: '' },
        resolver: zodResolver(loginSchema),
    });
    const email = useWatch({ control: form.control, name: 'email' }).trim();
    const registerHref = email ? `/auth/register?${new URLSearchParams({ email })}` : '/auth/register';
    const login = useMutation({
        mutationFn: (payload: LoginValues) =>
            fetchApiVoid('/api/auth/password/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }),
    });

    /** Signs in with an email and password, then refreshes the current profile. */
    async function handlePasswordSignIn(payload: LoginValues) {
        try {
            await login.mutateAsync(payload);
            await queryClient.invalidateQueries({ queryKey: userProfileQueryKey });
            navigate('/organizations', { replace: true });
        } catch (loginError) {
            showToast({
                body: loginError instanceof Error ? loginError.message : t('auth.loginFailed'),
                type: 'error',
            });
        }
    }

    return (
        <Stack gap={4} maxWidth={384} width="100%">
            <Stack gap={1} hAlign="center">
                <Heading level={1} justify="center">
                    <AuthWelcomeTitle />
                </Heading>
                <Divider label={t('auth.signInDescription')} />
            </Stack>

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
                        <Link href="/auth/forgot-password" type="supporting">
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
                        <Link href={registerHref} type="inherit" weight="medium">
                            {t('auth.createAccount')}
                        </Link>
                    </>
                }
            />

            <AuthLegalAgreement />
        </Stack>
    );
}
