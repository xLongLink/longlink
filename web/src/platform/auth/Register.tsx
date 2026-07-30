import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useLocation } from 'react-router';
import { z } from 'zod';
import { AuthPage } from '@/components/AuthPage';
import { AuthWelcomeTitle } from '@/components/AuthWelcomeTitle';
import { useToast } from '@/hooks/use-toast';
import { fetchApiVoid } from '@/lib/api';

type RegisterValues = {
    email: string;
};

/** Starts stateless account registration with an email verification link. */
export default function Register() {
    const t = useTranslator();
    const location = useLocation();
    const showToast = useToast();
    const initialEmail = new URLSearchParams(location.search).get('email') ?? '';
    const schema = z.object({
        email: z.string().trim().min(1, t('auth.emailRequired')).email(t('auth.emailInvalid')),
    });
    const form = useForm<RegisterValues>({
        defaultValues: { email: initialEmail },
        resolver: zodResolver(schema),
    });
    const email = useWatch({ control: form.control, name: 'email' }).trim();
    const signInQuery = email ? new URLSearchParams({ email }).toString() : '';
    const signInHref = signInQuery ? `/organizations?${signInQuery}` : '/organizations';
    const registration = useMutation({
        mutationFn: (payload: RegisterValues) =>
            fetchApiVoid('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }),
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
        <AuthPage title={<AuthWelcomeTitle />} description={<Divider label={t('auth.registerDescription')} />}>
            <Stack gap={3}>
                <Stack as="form" gap={3} onSubmit={form.handleSubmit(handleRegister)}>
                    <Controller
                        control={form.control}
                        name="email"
                        render={({ field, fieldState }) => (
                            <TextInput
                                {...{ autoComplete: 'email' as const }}
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
                            <Link href={signInHref} type="inherit" weight="medium">
                                {t('actions.login')}
                            </Link>
                        </>
                    }
                />
            </Stack>
        </AuthPage>
    );
}
