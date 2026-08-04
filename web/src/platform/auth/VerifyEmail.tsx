import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Grid } from '@astryxdesign/core/Grid';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Stack } from '@astryxdesign/core/Stack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { AuthLegalAgreement } from '@/components/AuthLegalAgreement';
import { AuthPage } from '@/components/AuthPage';
import { AuthWelcomeTitle } from '@/components/AuthWelcomeTitle';
import { PasswordInput } from '@/components/PasswordInput';
import { useToast } from '@/hooks/use-toast';
import { ApiError, fetchApiJson } from '@/lib/api';
import { zEmailPayload, zUserProfile } from '@/lib/generated/platform-api-v1/zod.gen';
import { platformApiPath } from '@/lib/platform-api';
import { userProfileQueryKey } from '@/lib/query-keys';
import { clearSessionQueries } from '@/lib/react-query';
import { useFragmentToken } from './use-fragment-token';

type RegistrationCompleteValues = {
    name: string;
    surname: string;
    password: string;
};

type RegistrationSetup = z.infer<typeof zEmailPayload>;

const REGISTRATION_TOKEN_KEY = 'longlink.registration.token';

/** Verifies an emailed registration link before collecting account credentials. */
export default function VerifyEmail() {
    const t = useTranslator();
    const showToast = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const token = useFragmentToken(REGISTRATION_TOKEN_KEY);
    const [accountExists, setAccountExists] = useState(false);
    const [setupMismatch, setSetupMismatch] = useState(false);
    const [lastVerifiedSetup, setLastVerifiedSetup] = useState<RegistrationSetup | null>(null);
    const schema = z.object({
        name: z.string().trim().min(1, t('auth.nameRequired')).max(127, t('auth.nameTooLong')),
        surname: z.string().trim().min(1, t('auth.surnameRequired')).max(127, t('auth.surnameTooLong')),
        password: z.string().min(1, t('auth.passwordRequired')).max(1024, t('auth.passwordTooLong')),
    });
    const form = useForm<RegistrationCompleteValues>({
        defaultValues: { name: '', surname: '', password: '' },
        resolver: zodResolver(schema),
    });
    const verification = useMutation({
        mutationFn: (registrationToken: string) => {
            if (!registrationToken) {
                return fetchApiJson(platformApiPath('/auth/register/setup'), undefined, (value) =>
                    zEmailPayload.parse(value)
                );
            }

            return fetchApiJson(
                platformApiPath('/auth/verify'),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: registrationToken }),
                },
                (value) => zEmailPayload.parse(value)
            );
        },
        onSuccess: (setup) => {
            setLastVerifiedSetup(setup);
        },
        onError: (error) => {
            // Invalid credentials cannot become valid through another retry.
            if (error instanceof ApiError && error.code === 'VERIFY_USER_BAD_TOKEN') {
                sessionStorage.removeItem(REGISTRATION_TOKEN_KEY);
            }
        },
    });
    const completion = useMutation({
        mutationFn: (payload: RegistrationCompleteValues) =>
            fetchApiJson(
                platformApiPath('/auth/register/complete'),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...payload, email: verification.data?.email }),
                },
                (value) => zUserProfile.parse(value)
            ),
    });
    /** Creates the account and publishes only the new authenticated query state. */
    async function handleComplete(payload: RegistrationCompleteValues) {
        try {
            const user = await completion.mutateAsync(payload);

            await clearSessionQueries(queryClient, [userProfileQueryKey]);
            queryClient.setQueryData(userProfileQueryKey, user);
            sessionStorage.removeItem(REGISTRATION_TOKEN_KEY);
            navigate('/organizations', { replace: true });
        } catch (error) {
            // Expired setup cookies move the page into the terminal replacement-link state.
            if (error instanceof ApiError && error.code === 'VERIFY_USER_BAD_TOKEN') {
                verification.mutate('');
            }
            if (error instanceof ApiError && error.code === 'REGISTER_SETUP_MISMATCH') {
                setSetupMismatch(true);
            }
            if (error instanceof ApiError && error.code === 'REGISTER_USER_ALREADY_EXISTS') {
                setAccountExists(true);
            }

            const message =
                error instanceof ApiError && error.code === 'REGISTER_USER_ALREADY_EXISTS'
                    ? t('auth.accountAlreadyExists')
                    : error instanceof ApiError && error.code === 'VERIFY_USER_BAD_TOKEN'
                      ? t('auth.invalidVerificationLink')
                      : t('auth.registrationFailed');

            showToast({ body: message, type: 'error' });
        }
    }

    useEffect(() => {
        // Repeat the idempotent exchange when Strict Mode remounts the mutation observer.
        verification.mutate(token);

        // oxlint-disable-next-line react-hooks/exhaustive-deps -- React Query keeps the mutate callback stable.
    }, [token, verification.mutate]);

    const recoverySetup = verification.data ?? lastVerifiedSetup;
    const recoverySearch = recoverySetup?.email ? `?${new URLSearchParams({ email: recoverySetup.email })}` : '';
    const recoveryRegisterHref = `/auth/register${recoverySearch}`;
    const recoverySignInHref = `/organizations${recoverySearch}`;

    // Keep transient verification failures retryable while expired credentials remain terminal.
    if (verification.error) {
        const invalidToken =
            verification.error instanceof ApiError && verification.error.code === 'VERIFY_USER_BAD_TOKEN';

        return (
            <AuthPage
                title={t('auth.verifyEmailTitle')}
                description={invalidToken ? t('auth.invalidVerificationLink') : t('auth.verificationFailed')}
            >
                <Stack gap={3}>
                    <Banner status="error" title={t('auth.verificationFailed')} />
                    {invalidToken ? null : (
                        <Button
                            isLoading={verification.isPending}
                            label={t('actions.retry')}
                            onClick={() => verification.mutate(token)}
                            variant="primary"
                        />
                    )}
                    <Button href={recoveryRegisterHref} label={t('auth.requestVerificationLink')} />
                </Stack>
            </AuthPage>
        );
    }

    // Wait for the server to authenticate the signed email claim.
    if (!verification.data) {
        return (
            <AuthPage title={t('auth.verifyEmailTitle')} description={t('auth.verifyingEmail')}>
                <Button isLoading label={t('auth.verifyingEmail')} variant="primary" />
            </AuthPage>
        );
    }

    // Account races and cross-tab setup changes cannot succeed by resubmitting the same form.
    if (accountExists || setupMismatch) {
        return (
            <AuthPage
                title={t('auth.completeRegistrationTitle')}
                description={setupMismatch ? t('auth.registrationSetupMismatch') : t('auth.accountAlreadyExists')}
            >
                <Stack gap={3}>
                    {accountExists ? (
                        <Button href={recoverySignInHref} label={t('auth.backToSignIn')} variant="primary" />
                    ) : null}
                    <Button href={recoveryRegisterHref} label={t('auth.requestVerificationLink')} />
                </Stack>
            </AuthPage>
        );
    }

    return (
        <AuthPage
            title={<AuthWelcomeTitle />}
            description={<Divider label={t('auth.completeRegistrationDescription')} />}
        >
            <Stack gap={4}>
                <Stack as="form" gap={3} onSubmit={form.handleSubmit(handleComplete)}>
                    <Grid columns={{ minWidth: 128, max: 2, repeat: 'fit' }} gap={3} width="100%">
                        <Controller
                            control={form.control}
                            name="name"
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...{ autoComplete: 'given-name' as const }}
                                    ref={field.ref}
                                    hasAutoFocus
                                    htmlName={field.name}
                                    isRequired
                                    label={t('labels.name')}
                                    onBlur={field.onBlur}
                                    onChange={field.onChange}
                                    status={
                                        fieldState.error
                                            ? { type: 'error', message: fieldState.error.message }
                                            : undefined
                                    }
                                    value={field.value}
                                    width="100%"
                                />
                            )}
                        />
                        <Controller
                            control={form.control}
                            name="surname"
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...{ autoComplete: 'family-name' as const }}
                                    ref={field.ref}
                                    htmlName={field.name}
                                    isRequired
                                    label={t('labels.surname')}
                                    onBlur={field.onBlur}
                                    onChange={field.onChange}
                                    status={
                                        fieldState.error
                                            ? { type: 'error', message: fieldState.error.message }
                                            : undefined
                                    }
                                    value={field.value}
                                    width="100%"
                                />
                            )}
                        />
                    </Grid>
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
                        isLoading={completion.isPending}
                        label={completion.isPending ? t('auth.creatingAccount') : t('auth.createAccount')}
                        type="submit"
                        variant="primary"
                    />
                </Stack>
                <Divider />
                <AuthLegalAgreement />
            </Stack>
        </AuthPage>
    );
}
