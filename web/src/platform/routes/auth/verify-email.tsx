import { z } from 'zod';
import { TextField } from './field';
import { api, ApiError } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { AuthLayout } from './auth-layout';
import { useNavigate } from 'react-router';
import { passwordSchema } from './validation';
import { useSubmit } from '@/lib/hooks/use-submit';
import { Button } from '@/components/shadcn/button';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { clearSessionQueries } from '@/lib/react-query';
import { Link } from '@/components/longlink/action/link';
import { Text } from '@/components/longlink/display/text';
import { Separator } from '@/components/shadcn/separator';
import { Stack } from '@/components/longlink/layout/stack';
import { useCurrentUser } from '@/platform/hooks/use-user';
import { useFragmentToken } from '@/lib/hooks/use-fragment-token';
import { zEmailPayload } from '@/lib/generated/platform-api-v1/zod.gen';
import { useVerification, type VerificationRequest } from '@/lib/hooks/use-verification';

const REGISTRATION_TOKEN_KEY = 'longlink.registration.token';

const registrationCompleteSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(255, 'Name cannot exceed 255 characters'),
    password: passwordSchema
});

type RegistrationCompleteValues = z.infer<typeof registrationCompleteSchema>;

/** Verifies an emailed registration link before collecting account credentials. */
export default function VerifyEmail() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { refetch } = useCurrentUser();
    const token = useFragmentToken(REGISTRATION_TOKEN_KEY);

    const form = useForm<RegistrationCompleteValues>({
        defaultValues: { name: '', password: '' },
        resolver: zodResolver(registrationCompleteSchema)
    });

    /** Returns the signed email claim while preserving cancellation of credential side effects. */
    async function verify({
        signal,
        token: registrationToken
    }: VerificationRequest): Promise<
        { status: 'verified'; data: z.output<typeof zEmailPayload> } | { status: 'error' } | undefined
    > {
        // Exchange the URL credential, or recover the server-owned registration setup.
        const request = registrationToken
            ? api('/api/v1/auth/verify', { json: { token: registrationToken }, method: 'POST', signal }).json(
                  zEmailPayload
              )
            : api('/api/v1/auth/register/setup', { signal }).json(zEmailPayload);

        // Handle only transport failures as invalid credentials.
        let data: z.output<typeof zEmailPayload>;

        try {
            data = await request;
        } catch (cause: unknown) {
            if (signal.aborted) return;

            if (!(cause instanceof ApiError) || cause.status !== 400) throw cause;
            sessionStorage.removeItem(REGISTRATION_TOKEN_KEY);

            return { status: 'error' };
        }

        // Clear the stored credential only while verification is still active.
        if (signal.aborted) return;

        sessionStorage.removeItem(REGISTRATION_TOKEN_KEY);

        return { status: 'verified', data };
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

            if (cause.status === 409) form.setError('root.accountConflict', { type: 'conflict' });

            // Expired setup cookies require recovering or replacing the registration link.
            if (cause.status === 400) void startVerification('');

            return;
        }

        // Refresh the persistent identity observer after replacing the previous session.
        await clearSessionQueries(queryClient);
        await refetch();
        void navigate('/user/organizations', { replace: true });
    }
    const save = useSubmit(handleComplete, { onError: (error) => form.setError('root', { message: error.message }) });

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
                    <Link href={recoveryRegisterHref} variant="primary">
                        Request a new registration link
                    </Link>
                </Stack>
            </AuthLayout>
        );
    }

    // Wait for the server to authenticate the signed email claim.
    if (verification?.status !== 'verified') {
        return (
            <AuthLayout title="Verify your email" description="Verifying your email...">
                {pageMetadata}
                <Button disabled aria-busy="true">
                    Verifying your email...
                </Button>
            </AuthLayout>
        );
    }

    // Account races cannot succeed by resubmitting the same form.
    if (form.formState.errors.root?.accountConflict) {
        return (
            <AuthLayout title="Complete your account" description="Request a new registration link to continue.">
                {pageMetadata}
                <Link href={recoveryRegisterHref} variant="primary">
                    Request a new registration link
                </Link>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            description={null}
            headingSize={3}
            title={<span className="block text-nowrap">Welcome to LongLink</span>}
        >
            {pageMetadata}
            <Stack gap={3}>
                <Separator />
                <form noValidate onSubmit={form.handleSubmit(save)} aria-busy={form.formState.isSubmitting}>
                    <Stack gap={2}>
                        <TextField
                            {...form.register('name')}
                            error={form.formState.errors.name?.message}
                            autoComplete="name"
                            required
                            label="Name"
                        />
                        <TextField
                            {...form.register('password')}
                            error={form.formState.errors.password?.message}
                            autoComplete="new-password"
                            required
                            label="Password"
                            type="password"
                        />
                        <Button className="w-full" type="submit">
                            Create account
                        </Button>
                    </Stack>
                </form>
                <Separator />
                <Text as="p" size="xs" align="center" tone="muted">
                    By continuing, you agree to our <br />
                    <Link href="/terms/">Terms of Service</Link> and <Link href="/privacy/">Privacy Policy</Link>.
                </Text>
            </Stack>
        </AuthLayout>
    );
}
