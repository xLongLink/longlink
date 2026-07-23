import { z } from 'zod';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { useToast } from '@astryxdesign/core/Toast';
import { Divider } from '@astryxdesign/core/Divider';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router';
import { useTranslator } from '@astryxdesign/core/i18n';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AuthPage } from '@/components/AuthPage';
import { ApiError, fetchApiJson } from '@/lib/api';
import { sanitizeRedirectPath } from '@/lib/redirects';
import { clearSessionQueries } from '@/lib/react-query';
import { PasswordInput } from '@/components/PasswordInput';
import { accountsQueryKey, userProfileQueryKey } from '@/lib/query-keys';
import { apiRegistrationVerifiedSchema, apiUserProfileSchema, parseApiResponse } from '@/lib/api-schemas';

type RegistrationCompleteValues = {
    name: string;
    surname: string;
    password: string;
};

type RegistrationSetup = z.infer<typeof apiRegistrationVerifiedSchema>;

const REGISTRATION_TOKEN_KEY = 'longlink.registration.token';
const nameInputAttributes = { autoComplete: 'given-name' } as const;
const surnameInputAttributes = { autoComplete: 'family-name' } as const;

/** Verifies an emailed registration link before collecting account credentials. */
export default function VerifyEmail() {
    const t = useTranslator();
    const showToast = useToast();
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [fragmentToken] = useState(
        () => new URLSearchParams(location.hash.replace(/^#/, '')).get('token')?.trim() ?? ''
    );
    const [token] = useState(() => fragmentToken || sessionStorage.getItem(REGISTRATION_TOKEN_KEY) || '');
    const [accountExists, setAccountExists] = useState(false);
    const [setupMismatch, setSetupMismatch] = useState(false);
    const [lastVerifiedSetup, setLastVerifiedSetup] = useState<RegistrationSetup | null>(null);
    const verificationStarted = useRef(false);
    const fallbackNextPath = sanitizeRedirectPath(new URLSearchParams(location.search).get('next'));
    const schema = z.object({
        name: z.string().trim().min(1, t('auth.nameRequired')).max(127, t('auth.nameTooLong')),
        surname: z.string().trim().min(1, t('auth.surnameRequired')).max(127, t('auth.surnameTooLong')),
        password: z.string().min(12, t('auth.passwordTooShort')).max(1024, t('auth.passwordTooLong')),
    });
    const form = useForm<RegistrationCompleteValues>({
        defaultValues: { name: '', surname: '', password: '' },
        resolver: zodResolver(schema),
    });
    const verification = useMutation({
        mutationFn: async (registrationToken: string) => {
            if (!registrationToken) {
                return fetchApiJson('/api/auth/register/setup', undefined, (value) =>
                    parseApiResponse(apiRegistrationVerifiedSchema, value)
                );
            }

            return fetchApiJson(
                '/api/auth/verify',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: registrationToken }),
                },
                (value) => parseApiResponse(apiRegistrationVerifiedSchema, value)
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
        mutationFn: async (payload: RegistrationCompleteValues) => {
            return fetchApiJson(
                '/api/auth/register/complete',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...payload, email: verification.data?.email }),
                },
                (value) => parseApiResponse(apiUserProfileSchema, value)
            );
        },
    });
    const verifyRegistration = verification.mutate;

    /** Creates the account and publishes only the new authenticated query state. */
    async function handleComplete(payload: RegistrationCompleteValues) {
        try {
            const user = await completion.mutateAsync(payload);
            const profileKey = userProfileQueryKey();
            const accountsKey = accountsQueryKey();

            await clearSessionQueries(queryClient, [profileKey, accountsKey]);
            queryClient.setQueryData(profileKey, user);
            await queryClient.invalidateQueries({ queryKey: accountsKey });
            sessionStorage.removeItem(REGISTRATION_TOKEN_KEY);
            navigate(sanitizeRedirectPath(verification.data?.next), { replace: true });
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

    useLayoutEffect(() => {
        // URL fragments do not reach the server; remove the credential before the page paints.
        if (fragmentToken) {
            sessionStorage.setItem(REGISTRATION_TOKEN_KEY, fragmentToken);
            window.history.replaceState(window.history.state, '', `${location.pathname}${location.search}`);
        }
    }, [fragmentToken, location.pathname, location.search]);

    useEffect(() => {
        // Strict Mode may rerun effects, but setup restoration needs only one initial request.
        if (verificationStarted.current) {
            return;
        }

        verificationStarted.current = true;
        verifyRegistration(token);
    }, [token, verifyRegistration]);

    const recoverySetup = verification.data ?? lastVerifiedSetup;
    const recoveryNextPath = sanitizeRedirectPath(recoverySetup?.next ?? fallbackNextPath);
    const recoveryQuery = new URLSearchParams({
        next: recoveryNextPath,
        ...(recoverySetup?.email ? { email: recoverySetup.email } : {}),
    }).toString();

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
                    <Button href={`/auth/register?${recoveryQuery}`} label={t('auth.requestVerificationLink')} />
                </Stack>
            </AuthPage>
        );
    }

    // Wait for the server to authenticate the signed email claim.
    if (!verification.data) {
        return (
            <AuthPage title={t('auth.verifyEmailTitle')} description={t('auth.verifyingEmail')}>
                <Button isDisabled isLoading label={t('auth.verifyingEmail')} variant="primary" />
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
                        <Button
                            href={`/organizations?${recoveryQuery}`}
                            label={t('auth.backToSignIn')}
                            variant="primary"
                        />
                    ) : null}
                    <Button href={`/auth/register?${recoveryQuery}`} label={t('auth.requestVerificationLink')} />
                </Stack>
            </AuthPage>
        );
    }

    return (
        <AuthPage
            title={t('auth.completeRegistrationTitle')}
            description={t('auth.completeRegistrationDescription', { email: verification.data.email })}
        >
            <Stack gap={4}>
                <Stack as="form" gap={3} onSubmit={form.handleSubmit(handleComplete)}>
                    <Controller
                        control={form.control}
                        name="name"
                        render={({ field, fieldState }) => (
                            <TextInput
                                {...nameInputAttributes}
                                ref={field.ref}
                                hasAutoFocus
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
                        name="surname"
                        render={({ field, fieldState }) => (
                            <TextInput
                                {...surnameInputAttributes}
                                ref={field.ref}
                                htmlName={field.name}
                                isRequired
                                label={t('labels.surname')}
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
                        isDisabled={completion.isPending}
                        isLoading={completion.isPending}
                        label={completion.isPending ? t('auth.creatingAccount') : t('auth.createAccount')}
                        type="submit"
                        variant="primary"
                    />
                </Stack>
                <Divider />
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
        </AuthPage>
    );
}
