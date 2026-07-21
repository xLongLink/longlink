import { z } from 'zod';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { useToast } from '@astryxdesign/core/Toast';
import { useMutation } from '@tanstack/react-query';
import { Divider } from '@astryxdesign/core/Divider';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router';
import { useTranslator } from '@astryxdesign/core/i18n';
import { TextInput } from '@astryxdesign/core/TextInput';
import { AuthPage } from '@/components/AuthPage';
import { Wordmark } from '@/components/Wordmark';
import { ApiError, fetchApiVoid } from '@/lib/api';
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
    const t = useTranslator();
    const location = useLocation();
    const navigate = useNavigate();
    const showToast = useToast();
    const nextPath = sanitizeRedirectPath(new URLSearchParams(location.search).get('next'));
    const nextQuery = new URLSearchParams({ next: nextPath }).toString();
    const welcomeTitle = (
        <span className="inline-flex flex-wrap items-baseline justify-center gap-2">
            <span>{t('auth.welcomeTo')}</span>
            <Wordmark style={{ fontSize: 'var(--text-heading-1-size)' }} />
        </span>
    );
    const registerDescription = <Divider label={t('auth.registerDescription')} />;
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
            await fetchApiVoid('/api/auth/register', {
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
        } catch (error) {
            // Show API failures as toasts so raw backend error codes never appear in the form.
            const message =
                error instanceof ApiError
                    ? error.message === 'REGISTER_USER_ALREADY_EXISTS'
                        ? t('auth.accountAlreadyExists')
                        : t('auth.registrationFailed')
                    : error instanceof Error
                      ? error.message
                      : t('auth.registrationFailed');

            showToast({ body: message, type: 'error' });
        }
    }

    return (
        <AuthPage title={welcomeTitle} description={registerDescription}>
            <Stack gap={3}>
                <Stack
                    as="form"
                    className="[&_.astryx-field-label>span]:hidden"
                    gap={3}
                    onSubmit={form.handleSubmit(handleRegister)}
                >
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
                                status={
                                    fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined
                                }
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
                                status={
                                    fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined
                                }
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
                                status={
                                    fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined
                                }
                                value={field.value}
                                width="100%"
                            />
                        )}
                    />
                    <Button
                        isDisabled={registration.isPending}
                        isLoading={registration.isPending}
                        label={registration.isPending ? t('auth.creatingAccount') : t('auth.createAccount')}
                        type="submit"
                        variant="primary"
                    />
                </Stack>
                <Stack gap={3}>
                    <Divider
                        label={
                            <>
                                {t('auth.haveAccount')}{' '}
                                <Link href={`/organizations?${nextQuery}`} type="inherit" weight="medium">
                                    {t('actions.login')}
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
            </Stack>
        </AuthPage>
    );
}
