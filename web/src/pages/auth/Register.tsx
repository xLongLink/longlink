import { z } from 'zod';
import { useLocation } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { useToast } from '@astryxdesign/core/Toast';
import { useMutation } from '@tanstack/react-query';
import { Divider } from '@astryxdesign/core/Divider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslator } from '@astryxdesign/core/i18n';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { fetchApiVoid } from '@/lib/api';
import { AuthPage } from '@/components/AuthPage';
import { Wordmark } from '@/components/Wordmark';
import { sanitizeRedirectPath } from '@/lib/redirects';

type RegisterValues = {
    email: string;
};

const emailInputAttributes = { autoComplete: 'email' } as const;

/** Starts stateless account registration with an email verification link. */
export default function Register() {
    const t = useTranslator();
    const location = useLocation();
    const showToast = useToast();
    const search = new URLSearchParams(location.search);
    const nextPath = sanitizeRedirectPath(search.get('next'));
    const initialEmail = search.get('email') ?? '';
    const welcomeTitle = (
        <span className="inline-flex flex-wrap items-baseline justify-center gap-2">
            <span>{t('auth.welcomeTo')}</span>
            <Wordmark size="heading" />
        </span>
    );
    const schema = z.object({
        email: z.string().trim().min(1, t('auth.emailRequired')).email(t('auth.emailInvalid')),
    });
    const form = useForm<RegisterValues>({
        defaultValues: { email: initialEmail },
        resolver: zodResolver(schema),
    });
    const email = useWatch({ control: form.control, name: 'email' }).trim();
    const signInQuery = new URLSearchParams({ next: nextPath, ...(email ? { email } : {}) });
    const registration = useMutation({
        mutationFn: async (payload: RegisterValues) => {
            await fetchApiVoid('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, next: nextPath }),
            });
        },
    });

    /** Requests an email link without creating a pending account. */
    async function handleRegister(payload: RegisterValues) {
        try {
            await registration.mutateAsync(payload);
            showToast({ body: t('auth.verificationEmailSent'), type: 'info' });
        } catch {
            showToast({ body: t('auth.registrationRequestFailed'), type: 'error' });
        }
    }

    return (
        <AuthPage title={welcomeTitle} description={<Divider label={t('auth.registerDescription')} />}>
            <Stack gap={3}>
                <Stack as="form" gap={3} onSubmit={form.handleSubmit(handleRegister)}>
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
                    <Button
                        isDisabled={registration.isPending}
                        isLoading={registration.isPending}
                        label={
                            registration.isPending
                                ? t('auth.sendingVerificationEmail')
                                : t('auth.sendVerificationEmail')
                        }
                        type="submit"
                        variant="primary"
                    />
                </Stack>
                <Divider
                    label={
                        <>
                            {t('auth.haveAccount')}{' '}
                            <Link href={`/organizations?${signInQuery.toString()}`} type="inherit" weight="medium">
                                {t('actions.login')}
                            </Link>
                        </>
                    }
                />
            </Stack>
        </AuthPage>
    );
}
