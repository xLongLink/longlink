import { z } from 'zod';
import { api, ApiError } from '@/lib/api';
import { NoIndex } from '@/components/Seo';
import { useNavigate } from 'react-router';
import { passwordSchema } from './validation';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { AuthForm, AuthLayout } from './AuthLayout';
import { Divider } from '@astryxdesign/core/Divider';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { clearSessionQueries } from '@/lib/react-query';
import { WelcomeTitle } from '@/components/WelcomeTitle';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useEffect, useEffectEvent, useRef } from 'react';
import { useFragmentToken } from '@/lib/hooks/use-fragment-token';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zEmailPayload, zUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';

const REGISTRATION_TOKEN_KEY = 'longlink.registration.token';
const registrationCompleteSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(255, 'Name cannot exceed 255 characters'),
    password: passwordSchema,
});

type RegistrationCompleteValues = z.infer<typeof registrationCompleteSchema>;

type VerificationRequest = {
    signal: AbortSignal;
    token: string;
};

/** Verifies an emailed registration link before collecting account credentials. */
export default function VerifyEmail() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const token = useFragmentToken(REGISTRATION_TOKEN_KEY);
    const verificationController = useRef<AbortController | null>(null);
    const form = useForm<RegistrationCompleteValues>({
        defaultValues: { name: '', password: '' },
        resolver: zodResolver(registrationCompleteSchema),
    });
    const verification = useMutation({
        mutationFn: async ({ signal, token: registrationToken }: VerificationRequest) => {
            if (!registrationToken) {
                return zEmailPayload.parse(await api('/api/v1/auth/register/setup', { signal }).json());
            }

            return zEmailPayload.parse(
                await api('/api/v1/auth/verify', {
                    json: { token: registrationToken },
                    method: 'POST',
                    signal,
                }).json()
            );
        },
        onError: (error, variables) => {
            // Invalid credentials cannot become valid through another retry.
            if (
                variables.signal === verificationController.current?.signal &&
                error instanceof ApiError &&
                error.status === 400
            ) {
                sessionStorage.removeItem(REGISTRATION_TOKEN_KEY);
            }
        },
    });
    const completion = useMutation({
        mutationFn: async (payload: RegistrationCompleteValues) => {
            return zUserSummary.parse(
                await api('/api/v1/auth/register/complete', {
                    json: payload,
                    method: 'POST',
                }).json()
            );
        },
    });
    /** Replaces the active credential exchange with a cancellable request. */
    function startVerification(verificationToken: string) {
        verificationController.current?.abort();
        const controller = new AbortController();
        verificationController.current = controller;
        verification.mutate({ signal: controller.signal, token: verificationToken });
    }

    const startInitialVerification = useEffectEvent(startVerification);

    /** Creates the account and publishes only the new authenticated query state. */
    async function handleComplete(payload: RegistrationCompleteValues) {
        try {
            const user = await completion.mutateAsync(payload);

            await clearSessionQueries(queryClient);
            queryClient.setQueryData(['api', '/api/v1/me'], user);
            sessionStorage.removeItem(REGISTRATION_TOKEN_KEY);
            navigate('/user/organizations', { replace: true });
        } catch (error) {
            // Expired setup cookies move the page into the terminal replacement-link state.
            if (error instanceof ApiError && error.status === 400) {
                startVerification('');
            }
        }
    }

    useEffect(() => {
        startInitialVerification(token);

        return () => {
            const controller = verificationController.current;
            verificationController.current = null;
            controller?.abort();
        };
    }, [token]);

    const recoveryRegisterHref = verification.data?.email
        ? `/auth/register?${new URLSearchParams({ email: verification.data.email })}`
        : '/auth/register';
    const pageMetadata = <NoIndex title="Verify Your Email | LongLink" />;

    // Keep transient verification failures retryable while expired credentials remain terminal.
    if (verification.error) {
        const verificationError = verification.error instanceof ApiError ? verification.error : null;
        const invalidToken = verificationError?.status === 400;

        return (
            <AuthLayout
                title="Verify your email"
                description={
                    invalidToken ? 'Request a new registration link to continue.' : 'Please try again in a moment.'
                }
            >
                {pageMetadata}
                <Stack gap={3}>
                    {invalidToken ? null : (
                        <Button label="Retry" onClick={() => startVerification(token)} variant="primary" />
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
                {pageMetadata}
                <Button isLoading label="Verifying your email..." variant="primary" />
            </AuthLayout>
        );
    }

    // Account races cannot succeed by resubmitting the same form.
    if (completion.error instanceof ApiError && completion.error.status === 409) {
        return (
            <AuthLayout title="Complete your account" description="Request a new registration link to continue.">
                {pageMetadata}
                <Button href={recoveryRegisterHref} label="Request a new registration link" />
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title={<WelcomeTitle />} description={<Divider label="Email verified. Complete your profile." />}>
            {pageMetadata}
            <Stack gap={4}>
                <AuthForm gap={3} onSubmit={form.handleSubmit(handleComplete)}>
                    <Controller
                        control={form.control}
                        name="name"
                        render={({ field, fieldState }) => (
                            <TextInput
                                ref={field.ref}
                                autoComplete="name"
                                hasAutoFocus
                                htmlName={field.name}
                                isRequired
                                label="Name"
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
                    <Button isLoading={completion.isPending} label="Create account" type="submit" variant="primary" />
                </AuthForm>
                <Divider />
                <Text as="p" justify="center" type="supporting">
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
