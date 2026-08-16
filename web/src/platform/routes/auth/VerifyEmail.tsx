import type { ReactNode } from 'react';
import { z } from 'zod';
import { useNavigate } from 'react-router';
import { Grid } from '@astryxdesign/core/Grid';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { Heading } from '@astryxdesign/core/Heading';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useEffect, useEffectEvent, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/lib/hooks/use-toast';
import { Divider } from '@/components/ui/Divider';
import { clearSessionQueries } from '@/lib/react-query';
import { WelcomeTitle } from '@/components/WelcomeTitle';
import { useFragmentToken } from '@/lib/hooks/use-fragment-token';
import { zEmailPayload, zUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';

const REGISTRATION_TOKEN_KEY = 'longlink.registration.token';
const registrationCompleteSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(127, 'Name cannot exceed 127 characters'),
    surname: z.string().trim().min(1, 'Surname is required').max(127, 'Surname cannot exceed 127 characters'),
    password: z.string().min(1, 'Password is required').max(1024, 'Password cannot exceed 1024 characters'),
});

type RegistrationCompleteValues = z.infer<typeof registrationCompleteSchema>;
type RegistrationSetup = z.infer<typeof zEmailPayload>;

/** Renders email verification content within the standalone account page. */
function AuthLayout({
    children,
    description,
    title,
}: {
    children: ReactNode;
    description: ReactNode;
    title: ReactNode;
}) {
    return (
        <Center minHeight="calc(100dvh - var(--appshell-header-height, 0px))" width="100%">
            <Stack gap={4} maxWidth={384} paddingBlock={8} paddingInline={4} width="100%">
                <Stack gap={1}>
                    <Heading justify="center" level={1}>
                        {title}
                    </Heading>
                    {typeof description === 'string' ? (
                        <Text as="p" color="secondary" justify="center" type="supporting">
                            {description}
                        </Text>
                    ) : (
                        description
                    )}
                </Stack>
                {children}
            </Stack>
        </Center>
    );
}

/** Verifies an emailed registration link before collecting account credentials. */
export default function VerifyEmail() {
    const showToast = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const token = useFragmentToken(REGISTRATION_TOKEN_KEY);
    const [lastVerifiedSetup, setLastVerifiedSetup] = useState<RegistrationSetup | null>(null);
    const form = useForm<RegistrationCompleteValues>({
        defaultValues: { name: '', surname: '', password: '' },
        resolver: zodResolver(registrationCompleteSchema),
    });
    const verification = useMutation({
        mutationFn: async (registrationToken: string) => {
            if (!registrationToken) {
                return zEmailPayload.parse(await api('/api/v1/auth/register/setup').json());
            }

            const response = await api('/api/v1/auth/verify', { json: { token: registrationToken }, method: 'POST' });

            return zEmailPayload.parse(await response.json());
        },
        onSuccess: (setup) => {
            setLastVerifiedSetup(setup);
        },
        onError: (error) => {
            // Invalid credentials cannot become valid through another retry.
            if (error instanceof ApiError && error.message === 'VERIFY_USER_BAD_TOKEN') {
                sessionStorage.removeItem(REGISTRATION_TOKEN_KEY);
            }
        },
    });
    const completion = useMutation({
        mutationFn: async (payload: RegistrationCompleteValues) => {
            const response = await api('/api/v1/auth/register/complete', {
                json: { ...payload, email: verification.data?.email },
                method: 'POST',
            });

            return zUserSummary.parse(await response.json());
        },
    });
    const verifyToken = useEffectEvent((value: string) => verification.mutate(value));
    /** Creates the account and publishes only the new authenticated query state. */
    async function handleComplete(payload: RegistrationCompleteValues) {
        try {
            const user = await completion.mutateAsync(payload);

            await clearSessionQueries(queryClient);
            queryClient.setQueryData(['api', '/api/v1/me'], user);
            sessionStorage.removeItem(REGISTRATION_TOKEN_KEY);
            navigate('/organizations', { replace: true });
        } catch (error) {
            // Expired setup cookies move the page into the terminal replacement-link state.
            if (error instanceof ApiError && error.message === 'VERIFY_USER_BAD_TOKEN') {
                verification.mutate('');
            }
            if (
                error instanceof ApiError &&
                (error.message === 'REGISTER_SETUP_MISMATCH' || error.message === 'REGISTER_USER_ALREADY_EXISTS')
            ) {
                return;
            }
            const message =
                error instanceof ApiError && error.message === 'REGISTER_USER_ALREADY_EXISTS'
                    ? 'An account with this email already exists. Sign in or reset your password to continue.'
                    : error instanceof ApiError && error.message === 'VERIFY_USER_BAD_TOKEN'
                      ? 'This registration link is invalid or expired. Request a new link to continue.'
                      : 'Could not create the account. Check your details and try again.';

            showToast({ body: message, type: 'error' });
        }
    }

    useEffect(() => {
        verifyToken(token);
    }, [token]);

    const recoverySetup = verification.data ?? lastVerifiedSetup;
    const recoverySearch = recoverySetup?.email ? `?${new URLSearchParams({ email: recoverySetup.email })}` : '';
    const recoveryRegisterHref = `/auth/register${recoverySearch}`;
    const recoverySignInHref = `/login${recoverySearch}`;
    const accountExists =
        completion.error instanceof ApiError && completion.error.message === 'REGISTER_USER_ALREADY_EXISTS';
    const setupMismatch =
        completion.error instanceof ApiError && completion.error.message === 'REGISTER_SETUP_MISMATCH';

    // Keep transient verification failures retryable while expired credentials remain terminal.
    if (verification.error) {
        const invalidToken =
            verification.error instanceof ApiError && verification.error.message === 'VERIFY_USER_BAD_TOKEN';

        return (
            <AuthLayout
                title="Verify your email"
                description={
                    invalidToken
                        ? 'This registration link is invalid or expired. Request a new link to continue.'
                        : 'LongLink could not verify this registration link.'
                }
            >
                <Stack gap={3}>
                    <Banner status="error" title="LongLink could not verify this registration link." />
                    {invalidToken ? null : (
                        <Button label="Retry" onClick={() => verification.mutate(token)} variant="primary" />
                    )}
                    <Button href={recoveryRegisterHref} label="Request a new registration link" />
                </Stack>
            </AuthLayout>
        );
    }

    // Wait for the server to authenticate the signed email claim.
    if (!verification.data) {
        return (
            <AuthLayout title="Verify your email" description="Verifying your email...">
                <Button isLoading label="Verifying your email..." variant="primary" />
            </AuthLayout>
        );
    }

    // Account races and cross-tab setup changes cannot succeed by resubmitting the same form.
    if (accountExists || setupMismatch) {
        return (
            <AuthLayout
                title="Complete your account"
                description={
                    setupMismatch
                        ? 'Another registration was verified in this browser. Reopen the link for this email to continue safely.'
                        : 'An account with this email already exists. Sign in or reset your password to continue.'
                }
            >
                <Stack gap={3}>
                    {accountExists ? (
                        <Button href={recoverySignInHref} label="Back to sign in" variant="primary" />
                    ) : null}
                    <Button href={recoveryRegisterHref} label="Request a new registration link" />
                </Stack>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title={<WelcomeTitle />}
            description={<Divider>{'Email verified. Complete your profile.'}</Divider>}
        >
            <Stack gap={4}>
                <Stack as="form" gap={3} onSubmit={form.handleSubmit(handleComplete)}>
                    <Grid columns={{ minWidth: 128, max: 2, repeat: 'fit' }} gap={3} width="100%">
                        <Controller
                            control={form.control}
                            name="name"
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...{ autoComplete: 'given-name' }}
                                    ref={field.ref}
                                    hasAutoFocus
                                    htmlName={field.name}
                                    isRequired
                                    label="Name"
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
                                    {...{ autoComplete: 'family-name' }}
                                    ref={field.ref}
                                    htmlName={field.name}
                                    isRequired
                                    label="Surname"
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
                            <TextInput
                                ref={field.ref}
                                htmlName={field.name}
                                isRequired
                                label="Password"
                                onBlur={field.onBlur}
                                onChange={field.onChange}
                                status={
                                    fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined
                                }
                                value={field.value}
                                width="100%"
                                type="password"
                            />
                        )}
                    />
                    <Button
                        isLoading={completion.isPending}
                        label={completion.isPending ? 'Creating account...' : 'Create account'}
                        type="submit"
                        variant="primary"
                    />
                </Stack>
                <Divider />
                <Text as="p" color="secondary" justify="center" type="supporting">
                    By continuing, you agree to our <br />
                    <Link href="/terms" hasUnderline type="inherit">
                        Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" hasUnderline type="inherit">
                        Privacy Policy
                    </Link>
                    .
                </Text>
            </Stack>
        </AuthLayout>
    );
}
