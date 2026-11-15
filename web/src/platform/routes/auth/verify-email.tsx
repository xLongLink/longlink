import { z } from 'zod';
import { TextField } from './field';
import { api, ApiError } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { AuthLayout } from './auth-layout';
import { useNavigate } from 'react-router';
import { passwordSchema } from './validation';
import { useCurrentUser } from '@/lib/hooks/use-user';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { clearSessionQueries } from '@/lib/react-query';
import { Separator } from '@/components/shadcn/separator';
import { useFragmentToken } from '@/lib/hooks/use-fragment-token';
import { NativeLink as Link } from '@/components/custom/native-link';
import { NativeNavigationLink } from '@/components/custom/native-link';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { zEmailPayload } from '@/lib/generated/platform-api-v1/zod.gen';
import { Button, buttonVariants } from '@/components/longlink/action/button';
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
            ? api('/api/v1/auth/verify', { json: { token: registrationToken }, method: 'POST', signal }).json()
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

        const data = zEmailPayload.parse(value);
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
                    <NativeNavigationLink href={recoveryRegisterHref} className={buttonVariants()}>
                        Request a new registration link
                    </NativeNavigationLink>
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
                <NativeNavigationLink href={recoveryRegisterHref} className={buttonVariants()}>
                    Request a new registration link
                </NativeNavigationLink>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            description={null}
            title={<span className="text-2xl block text-nowrap text-center">Welcome to LongLink</span>}
        >
            {pageMetadata}
            <Stack gap={3}>
                <Separator />
                <form noValidate action={() => form.handleSubmit(handleComplete)()}>
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">Name</span>
                            <TextField
                                control={form.control}
                                name="name"
                                autoComplete="name"
                                labelHidden
                                required
                                label="Name"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">Password</span>
                            <TextField
                                control={form.control}
                                name="password"
                                autoComplete="new-password"
                                labelHidden
                                required
                                label="Password"
                                type="password"
                            />
                        </div>
                        <Button className="w-full" type="submit">
                            Create account
                        </Button>
                    </div>
                </form>
                <Separator />
                <p className="text-xs text-center text-muted-foreground">
                    By continuing, you agree to our <br />
                    <Link href="/terms/" className="underline">
                        Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy/" className="underline">
                        Privacy Policy
                    </Link>
                    .
                </p>
            </Stack>
        </AuthLayout>
    );
}
