import { z } from 'zod';
import { useState } from 'react';
import { TextField } from './Field';
import { AuthLayout } from './AuthLayout';
import { api, ApiError } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { passwordSchema } from './validation';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Welcome } from '@/components/Wordmark';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { clearSessionQueries } from '@/lib/react-query';
import { useFragmentToken } from '@/lib/hooks/use-fragment-token';
import { zEmailPayload } from '@/lib/generated/platform-api-v1/zod.gen';
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

    const [accountConflict, setAccountConflict] = useState(false);

    /** Returns the signed email claim while preserving cancellation of credential side effects. */
    async function verify({
        signal,
        token: registrationToken,
    }: VerificationRequest): Promise<
        { status: 'verified'; data: z.output<typeof zEmailPayload> } | { status: 'error' } | undefined
    > {
        // Exchange the URL credential, or recover the server-owned registration setup.
        const request = registrationToken
            ? api('/api/v1/auth/verify', {
                  json: { token: registrationToken },
                  method: 'POST',
                  signal,
              }).json()
            : api('/api/v1/auth/register/setup', { signal }).json();

        // Handle only transport failures as invalid credentials.
        let value: unknown;

        try {
            value = await request;
        } catch (cause: unknown) {
            if (signal.aborted) return;

            if (!(cause instanceof ApiError) || cause.status !== 400) throw cause;
            sessionStorage.removeItem(REGISTRATION_TOKEN_KEY);

            return { status: 'error' };
        }

        // Validate the email claim only while verification is still active.
        if (signal.aborted) return;

        return { status: 'verified', data: zEmailPayload.parse(value) };
    }

    const { verification, startVerification } = useVerification(token, verify);
    const verifiedEmail = verification?.status === 'verified' ? verification.data.email : null;

    /** Creates the account and clears the previous session's cached data. */
    async function handleComplete(payload: RegistrationCompleteValues) {
        // Recover only expected account-creation transport failures.
        try {
            await api('/api/v1/auth/register/complete', { json: payload, method: 'POST' });
        } catch (cause: unknown) {
            if (!(cause instanceof ApiError) || ![400, 409].includes(cause.status)) throw cause;

            if (cause.status === 409) setAccountConflict(true);

            // Expired setup cookies require recovering or replacing the registration link.
            if (cause.status === 400) void startVerification('');

            return;
        }

        // Clear cached data after account creation; the identity query loads the complete profile.
        await clearSessionQueries(queryClient);
        sessionStorage.removeItem(REGISTRATION_TOKEN_KEY);
        void navigate('/user/organizations', { replace: true });
    }

    const recoveryRegisterHref = verifiedEmail
        ? `/auth/register?${new URLSearchParams({ email: verifiedEmail })}`
        : '/auth/register';

    const pageMetadata = <title>Verify Your Email | LongLink</title>;

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
        <AuthLayout title={<Welcome />} description={<Divider label="Email verified. Complete your profile." />}>
            {pageMetadata}
            <Stack gap={4}>
                <form action={() => form.handleSubmit(handleComplete)()}>
                    <Stack gap={3}>
                        <TextField
                            control={form.control}
                            name="name"
                            autoComplete="name"
                            hasAutoFocus
                            isRequired
                            label="Name"
                            width="100%"
                        />
                        <TextField
                            control={form.control}
                            name="password"
                            isRequired
                            label="Password"
                            width="100%"
                            type="password"
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
