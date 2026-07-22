import { z } from 'zod';
import { useEffect } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { useToast } from '@astryxdesign/core/Toast';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router';
import { useTranslator } from '@astryxdesign/core/i18n';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApiVoid } from '@/lib/api';
import { AuthPage } from '@/components/AuthPage';
import { sanitizeRedirectPath } from '@/lib/redirects';
import { accountsQueryKey, userProfileQueryKey } from '@/lib/query-keys';

type VerifyEmailValues = {
    token: string;
};

type RequestVerificationValues = {
    email: string;
};

const emailInputAttributes = { autoComplete: 'email' } as const;
const submittedVerificationLinks = new Set<string>();
const verificationSchema = z.object({
    token: z.string().trim().min(1),
});

/** Verifies an emailed link and supports requesting a replacement verification email. */
export default function VerifyEmail() {
    const t = useTranslator();
    const showToast = useToast();
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const search = new URLSearchParams(location.search);
    const email = search.get('email') ?? '';
    const token = search.get('token') ?? '';
    const wasSent = search.get('sent') === 'true';
    const nextPath = sanitizeRedirectPath(search.get('next'));
    const nextQuery = new URLSearchParams({ next: nextPath }).toString();
    const requestSchema = z.object({
        email: z.string().trim().min(1, t('auth.emailRequired')).email(t('auth.emailInvalid')),
    });
    const form = useForm<RequestVerificationValues>({
        defaultValues: { email },
        resolver: zodResolver(requestSchema),
    });
    const verification = useMutation({
        mutationFn: async (payload: VerifyEmailValues) => {
            await fetchApiVoid('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: userProfileQueryKey() }),
                queryClient.invalidateQueries({ queryKey: accountsQueryKey() }),
            ]);
            navigate(`/organizations?${nextQuery}`, { replace: true });
        },
    });
    const requestVerification = useMutation({
        mutationFn: async (payload: RequestVerificationValues) => {
            await fetchApiVoid('/api/auth/request-verify-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        },
    });
    const verifyEmail = verification.mutate;

    /** Requests a replacement verification link and reports transient failures. */
    async function handleRequestVerification(payload: RequestVerificationValues) {
        try {
            await requestVerification.mutateAsync(payload);
        } catch (error) {
            showToast({
                body: error instanceof Error ? error.message : t('appView.retryLater'),
                type: 'error',
            });
        }
    }

    useEffect(() => {
        const payload = { token };

        // Automatically verify one-time links while keeping manual resend available.
        if (!token || submittedVerificationLinks.has(token)) {
            return;
        }

        const result = verificationSchema.safeParse(payload);
        if (!result.success) {
            return;
        }

        submittedVerificationLinks.add(token);
        verifyEmail(result.data);
    }, [token, verifyEmail]);

    let statusMessage = wasSent ? t('auth.verificationEmailSent') : t('auth.verifyEmailDescription');

    // Link processing takes precedence over the informational resend state.
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
                <Stack as="form" gap={4} onSubmit={form.handleSubmit(handleRequestVerification)}>
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
                    <Button
                        isDisabled={requestVerification.isPending}
                        isLoading={requestVerification.isPending}
                        label={
                            requestVerification.isPending
                                ? t('auth.sendingVerificationEmail')
                                : t('auth.resendVerificationEmail')
                        }
                        type="submit"
                        variant="primary"
                    />
                </Stack>
            )}
        </AuthPage>
    );
}
