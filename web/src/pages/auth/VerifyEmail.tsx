import { z } from 'zod';
import { useEffect, useRef } from 'react';
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
    email: string;
};

const emailInputAttributes = { autoComplete: 'email' };

/** Verifies an emailed token and supports requesting a replacement verification email. */
export default function VerifyEmail() {
    const t = useTranslator();
    const location = useLocation();
    const search = new URLSearchParams(location.search);
    const token = search.get('token');
    const email = search.get('email') ?? '';
    const wasSent = search.get('sent') === 'true';
    const nextPath = sanitizeRedirectPath(search.get('next'));
    const nextQuery = new URLSearchParams({ next: nextPath }).toString();
    const requestedToken = useRef<string | null>(null);
    const schema = z.object({
        email: z.string().trim().min(1, t('auth.emailRequired')).email(t('auth.emailInvalid')),
    });
    const form = useForm<VerifyEmailValues>({
        defaultValues: { email },
        resolver: zodResolver(schema),
    });
    const verification = useMutation({
        mutationFn: async (verificationToken: string) => {
            await fetchApiVoid('/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: verificationToken }),
            });
        },
    });
    const requestVerification = useMutation({
        mutationFn: async (payload: VerifyEmailValues) => {
            await fetchApiVoid('/auth/request-verify-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        },
    });
    const verifyToken = verification.mutate;

    useEffect(() => {
        // Submit each URL token once, including under React Strict Mode.
        if (!token || requestedToken.current === token) {
            return;
        }

        requestedToken.current = token;
        verifyToken(token);
    }, [token, verifyToken]);

    const showRequestForm = !token || verification.isError;
    let statusMessage = wasSent ? t('auth.verificationEmailSent') : t('auth.verifyEmailDescription');

    // Token processing takes precedence over the informational resend state.
    if (token && verification.isPending) {
        statusMessage = t('auth.verifyingEmail');
    } else if (verification.isSuccess) {
        statusMessage = t('auth.emailVerified');
    }

    return (
        <AuthPage title={t('auth.verifyEmailTitle')} description={statusMessage}>
            {verification.error ? <Banner status="error" title={verification.error.message} /> : null}

            {showRequestForm ? (
                <Stack as="form" gap={4} onSubmit={form.handleSubmit((payload) => requestVerification.mutate(payload))}>
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
                        type="submit"
                        variant="secondary"
                    />
                </Stack>
            ) : null}

            {verification.isSuccess || verification.isError || !token ? (
                <Button href={`/organizations?${nextQuery}`} label={t('auth.backToSignIn')} variant="primary" />
            ) : null}
        </AuthPage>
    );
}
