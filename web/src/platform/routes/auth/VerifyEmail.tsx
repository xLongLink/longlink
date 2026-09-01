import { z } from 'zod';
import { api, ApiError } from '@/lib/api';
import { useNavigate } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@/lib/hooks/use-toast';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { AuthForm, AuthLayout } from './AuthLayout';
import { Divider } from '@astryxdesign/core/Divider';
import { clearSessionQueries } from '@/lib/react-query';
import { WelcomeTitle } from '@/components/WelcomeTitle';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useEffect, useEffectEvent, useRef } from 'react';
import { fieldErrorStatus, passwordSchema } from './validation';
import { revalidateLogic, useForm } from '@tanstack/react-form';
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
    const showToast = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const token = useFragmentToken(REGISTRATION_TOKEN_KEY);
    const verificationController = useRef<AbortController | null>(null);
    const form = useForm({
        defaultValues: { name: '', password: '' },
        validationLogic: revalidateLogic(),
        validators: { onDynamic: registrationCompleteSchema },
        onSubmit: ({ value }) => handleComplete(value),
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
                return;
            }
            if (error instanceof ApiError && error.status === 409) {
                return;
            }

            showToast({
                body: error instanceof ApiError ? error.message : 'error',
                type: 'error',
            });
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

    // Keep transient verification failures retryable while expired credentials remain terminal.
    if (verification.error) {
        const verificationError = verification.error instanceof ApiError ? verification.error : null;
        const invalidToken = verificationError?.status === 400;

        return (
            <AuthLayout title="Verify your email" description={verificationError?.message ?? 'error'}>
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
                <Button isLoading label="Verifying your email..." variant="primary" />
            </AuthLayout>
        );
    }

    // Account races cannot succeed by resubmitting the same form.
    if (completion.error instanceof ApiError && completion.error.status === 409) {
        return (
            <AuthLayout title="Complete your account" description={completion.error.message}>
                <Button href={recoveryRegisterHref} label="Request a new registration link" />
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title={<WelcomeTitle />} description={<Divider label="Email verified. Complete your profile." />}>
            <Stack gap={4}>
                <AuthForm gap={3} onSubmit={form.handleSubmit}>
                    <form.Field
                        name="name"
                        children={(field) => (
                            <TextInput
                                autoComplete="name"
                                hasAutoFocus
                                htmlName="name"
                                isRequired
                                label="Name"
                                onBlur={field.handleBlur}
                                onChange={field.handleChange}
                                status={fieldErrorStatus(field.state.meta.errors)}
                                value={field.state.value}
                                width="100%"
                            />
                        )}
                    />
                    <form.Field
                        name="password"
                        children={(field) => (
                            <TextInput
                                htmlName="password"
                                isRequired
                                label="Password"
                                onBlur={field.handleBlur}
                                onChange={field.handleChange}
                                status={fieldErrorStatus(field.state.meta.errors)}
                                value={field.state.value}
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
