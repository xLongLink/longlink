import { z } from 'zod';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router';
import { TextInput } from '@astryxdesign/core/TextInput';
import { fetchApiVoid } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { useAuthConfig } from '@/hooks/use-auth';
import { AuthPage } from '@/components/AuthPage';
import { sanitizeRedirectPath } from '@/lib/redirects';
import { PasswordInput } from '@/components/PasswordInput';

type RegisterValues = {
    name: string;
    email: string;
    password: string;
};

const emailInputAttributes = { autoComplete: 'email' };
const nameInputAttributes = { autoComplete: 'name' };

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
                <Text as="p" color="secondary" justify="center" role="status" type="supporting">
                    {t('auth.loadingAuthentication')}
                </Text>
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
                <Button href={`/organizations?${nextQuery}`} label={t('auth.backToSignIn')} variant="secondary" />
            </AuthPage>
        );
    }

    return (
        <AuthPage title={t('auth.createAccount')} description={t('auth.registerDescription')}>
            <Stack as="form" gap={4} onSubmit={form.handleSubmit(handleRegister)}>
                <Controller
                    control={form.control}
                    name="name"
                    render={({ field, fieldState }) => (
                        <TextInput
                            {...nameInputAttributes}
                            ref={field.ref}
                            htmlName={field.name}
                            isRequired
                            label={t('labels.name')}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                            value={field.value}
                            width="100%"
                        />
                    )}
                />
                <Controller
                    control={form.control}
                    name="email"
                    render={({ field, fieldState }) => (
                        <TextInput
                            {...emailInputAttributes}
                            ref={field.ref}
                            htmlName={field.name}
                            isRequired
                            label={t('labels.email')}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                            type="email"
                            value={field.value}
                            width="100%"
                        />
                    )}
                />
                <Controller
                    control={form.control}
                    name="password"
                    render={({ field, fieldState }) => (
                        <PasswordInput
                            ref={field.ref}
                            autoComplete="new-password"
                            htmlName={field.name}
                            isRequired
                            label={t('labels.password')}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                            value={field.value}
                            width="100%"
                        />
                    )}
                />
                {registration.error ? <Banner status="error" title={registration.error.message} /> : null}
                <Button
                    isDisabled={registration.isPending}
                    isLoading={registration.isPending}
                    label={registration.isPending ? t('auth.creatingAccount') : t('auth.createAccount')}
                    type="submit"
                    variant="primary"
                />
            </Stack>
            <Text as="p" color="secondary" justify="center" type="supporting">
                {t('auth.haveAccount')}{' '}
                <Link href={`/organizations?${nextQuery}`} type="inherit" weight="medium">
                    {t('actions.login')}
                </Link>
            </Text>
        </AuthPage>
    );
}
