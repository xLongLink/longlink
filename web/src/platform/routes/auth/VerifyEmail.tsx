import { z } from 'zod';
import { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import { api, ApiError } from '@/lib/api';
import { NoIndex } from '@/components/Seo';
import { useNavigate } from 'react-router';
import { passwordSchema } from './validation';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { clearSessionQueries } from '@/lib/react-query';
import { WelcomeTitle } from '@/components/WelcomeTitle';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useFragmentToken } from '@/lib/hooks/use-fragment-token';
import { zEmailPayload, zUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';
import { useVerification, type VerificationRequest } from '@/lib/hooks/use-verification';

const REGISTRATION_TOKEN_KEY = 'longlink.registration.token';
const registrationCompleteSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(255, 'Name cannot exceed 255 characters'),
    password: passwordSchema,
});

type RegistrationCompleteValues = z.infer<typeof registrationCompleteSchema>;

/** Verifies an emailed registration link before collecting account credentials. */
export default function VerifyEmail() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const token = useFragmentToken(REGISTRATION_TOKEN_KEY);
    const form = useForm<RegistrationCompleteValues>({
        defaultValues: { name: '', password: '' },
        resolver: zodResolver(registrationCompleteSchema),
    });
    const [verification, setVerification] = useState<
        { status: 'verified'; data: z.output<typeof zEmailPayload> } | { status: 'error' } | null
    >(null);
    const [accountConflict, setAccountConflict] = useState(false);

    /** Verifies the signed email claim without publishing canceled or replaced results. */
    async function verify({ signal, token: registrationToken }: VerificationRequest) {
        setVerification(null);

        // Exchange the URL credential, or recover the server-owned registration setup.
        const request = registrationToken
            ? api('/api/v1/auth/verify', {
                  json: { token: registrationToken },
                  method: 'POST',
                  signal,
              }).json()
            : api('/api/v1/auth/register/setup', { signal }).json();
        await request.then(
            (value) => {
                if (signal.aborted) return;
                setVerification({ status: 'verified', data: zEmailPayload.parse(value) });
            },
            (error: unknown) => {
                if (signal.aborted) return;
                if (!(error instanceof ApiError) || error.status !== 400) throw error;
                sessionStorage.removeItem(REGISTRATION_TOKEN_KEY);
                setVerification({ status: 'error' });
            }
        );
    }

    const { startVerification } = useVerification(token, verify);
    const verifiedEmail = verification?.status === 'verified' ? verification.data.email : null;

    /** Creates the account and publishes only the new authenticated query state. */
    async function handleComplete(payload: RegistrationCompleteValues) {
        setAccountConflict(false);

        // Publish the new authenticated identity only after account creation succeeds.
        await api('/api/v1/auth/register/complete', { json: payload, method: 'POST' })
            .json()
            .then(
                async (value) => {
                    const user = zUserSummary.parse(value);
                    await clearSessionQueries(queryClient);
                    queryClient.setQueryData(['api', '/api/v1/me'], user);
                    sessionStorage.removeItem(REGISTRATION_TOKEN_KEY);
                    void navigate('/user/organizations', { replace: true });
                },
                (error: unknown) => {
                    if (!(error instanceof ApiError) || ![400, 409].includes(error.status)) throw error;
                    if (error.status === 409) setAccountConflict(true);

                    // Expired setup cookies require recovering or replacing the registration link.
                    if (error.status === 400) startVerification('');
                }
            );
    }

    const recoveryRegisterHref = verifiedEmail
        ? `/auth/register?${new URLSearchParams({ email: verifiedEmail })}`
        : '/auth/register';
    const pageMetadata = <NoIndex title="Verify Your Email | LongLink" />;

    // Invalid credentials require a replacement registration link.
    if (verification?.status === 'error') {
        return (
            <AuthLayout title="Verify your email" description="Request a new registration link to continue.">
                {pageMetadata}
                <Stack gap={3}>
                    <Button href={recoveryRegisterHref} label="Request a new registration link" />
                </Stack>
            </AuthLayout>
        );
    }

    // Wait for the server to authenticate the signed email claim.
    if (verification?.status !== 'verified') {
        return (
            <AuthLayout title="Verify your email" description="Verifying your email...">
                {pageMetadata}
                <Button isLoading label="Verifying your email..." variant="primary" />
            </AuthLayout>
        );
    }

    // Account races cannot succeed by resubmitting the same form.
    if (accountConflict) {
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
                <form action={() => form.handleSubmit(handleComplete)()}>
                    <Stack gap={3}>
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
                                        fieldState.error
                                            ? { type: 'error', message: fieldState.error.message }
                                            : undefined
                                    }
                                    value={field.value}
                                    width="100%"
                                    type="password"
                                />
                            )}
                        />
                        <Button label="Create account" type="submit" variant="primary" />
                    </Stack>
                </form>
                <Divider />
                <Text as="p" justify="center" type="supporting">
                    By continuing, you agree to our <br />
                    <Link href="/terms/" hasUnderline type="inherit">
                        Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy/" hasUnderline type="inherit">
                        Privacy Policy
                    </Link>
                    .
                </Text>
            </Stack>
        </AuthLayout>
    );
}
