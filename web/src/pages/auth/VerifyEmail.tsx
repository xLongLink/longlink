import { z } from 'zod';
import { useLocation } from 'react-router';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslator } from '@astryxdesign/core/i18n';
import { TextInput } from '@astryxdesign/core/TextInput';
import { fetchApiVoid } from '@/lib/api';
import { AuthPage } from '@/components/AuthPage';
import { sanitizeRedirectPath } from '@/lib/redirects';

type VerifyEmailValues = {
    code: string;
    email: string;
};

type RequestVerificationValues = Pick<VerifyEmailValues, 'email'>;

const codeInputAttributes = { autoComplete: 'one-time-code', inputMode: 'numeric' } as const;
const emailInputAttributes = { autoComplete: 'email' } as const;

/** Verifies an emailed code and supports requesting a replacement verification email. */
export default function VerifyEmail() {
    const t = useTranslator();
    const location = useLocation();
    const search = new URLSearchParams(location.search);
    const email = search.get('email') ?? '';
    const wasSent = search.get('sent') === 'true';
    const nextPath = sanitizeRedirectPath(search.get('next'));
    const nextQuery = new URLSearchParams({ next: nextPath }).toString();
    const schema = z.object({
        code: z.string().trim().regex(/^\d{8}$/, t('auth.verificationCodeInvalid')),
        email: z.string().trim().min(1, t('auth.emailRequired')).email(t('auth.emailInvalid')),
    });
    const form = useForm<VerifyEmailValues>({
        defaultValues: { code: '', email },
        resolver: zodResolver(schema),
    });
    const verification = useMutation({
        mutationFn: async (payload: VerifyEmailValues) => {
            await fetchApiVoid('/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        },
    });
    const requestVerification = useMutation({
        mutationFn: async (payload: RequestVerificationValues) => {
            await fetchApiVoid('/auth/request-verify-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        },
    });

    /** Sends another code to the email currently entered in the form. */
    async function handleRequestVerification() {
        const emailIsValid = await form.trigger('email');

        // Do not request a code until the email field passes client validation.
        if (!emailIsValid) {
            return;
        }

        requestVerification.mutate({ email: form.getValues('email') });
    }

    let statusMessage = wasSent ? t('auth.verificationEmailSent') : t('auth.verifyEmailDescription');

    // Code processing takes precedence over the informational resend state.
    if (verification.isPending) {
        statusMessage = t('auth.verifyingEmail');
    } else if (verification.isSuccess) {
        statusMessage = t('auth.emailVerified');
    }

    return (
        <AuthPage title={t('auth.verifyEmailTitle')} description={statusMessage}>
            {verification.error ? <Banner status="error" title={verification.error.message} /> : null}

            {verification.isSuccess ? (
                <Button href={`/organizations?${nextQuery}`} label={t('auth.backToSignIn')} variant="primary" />
            ) : (
                <Stack as="form" gap={4} onSubmit={form.handleSubmit((payload) => verification.mutate(payload))}>
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
                        name="code"
                        render={({ field, fieldState }) => (
                            <TextInput
                                {...codeInputAttributes}
                                ref={field.ref}
                                htmlName={field.name}
                                isRequired
                                label={t('auth.verificationCode')}
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
                    {requestVerification.isSuccess ? (
                        <Banner status="success" title={t('auth.verificationEmailSent')} />
                    ) : null}
                    {requestVerification.error ? (
                        <Banner status="error" title={requestVerification.error.message} />
                    ) : null}
                    <Button
                        isDisabled={requestVerification.isPending}
                        isLoading={requestVerification.isPending}
                        label={
                            requestVerification.isPending
                                ? t('auth.sendingVerificationEmail')
                                : t('auth.resendVerificationEmail')
                        }
                        onClick={() => void handleRequestVerification()}
                        type="button"
                        variant="secondary"
                    />
                    <Button
                        isDisabled={verification.isPending}
                        isLoading={verification.isPending}
                        label={verification.isPending ? t('auth.verifyingEmail') : t('auth.verifyEmail')}
                        type="submit"
                        variant="primary"
                    />
                </Stack>
            )}
        </AuthPage>
    );
}
