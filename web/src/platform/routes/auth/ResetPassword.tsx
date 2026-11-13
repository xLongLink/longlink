import { z } from 'zod';
import { TextField } from './Field';
import { AuthLayout } from './AuthLayout';
import { api, ApiError } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { CircleCheck } from 'lucide-react';
import { passwordSchema } from './validation';
import { Divider } from '@/components/ui/Divider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAnnouncement } from '@/components/ui/announcement';
import { useFragmentToken } from '@/lib/hooks/use-fragment-token';
import { NativeStack as Stack } from '@/components/ui/NativeStack';
import { NativeButton as Button } from '@/components/ui/NativeButton';
import { useVerification, type VerificationRequest } from '@/lib/hooks/use-verification';

const PASSWORD_RESET_TOKEN_KEY = 'longlink.password-reset.token';

const resetPasswordSchema = z.object({
    password: passwordSchema,
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/** Returns whether an API error reports an invalid or expired reset token. */
function isBadTokenError(cause: unknown): boolean {
    return cause instanceof ApiError && cause.status === 400;
}

/** Accepts a password reset token and saves a new password. */
export default function ResetPassword() {
    const token = useFragmentToken(PASSWORD_RESET_TOKEN_KEY);

    const form = useForm<ResetPasswordValues>({
        defaultValues: { password: '' },
        resolver: zodResolver(resetPasswordSchema),
    });

    const confirmation = 'Your password has been reset. You can now sign in.';

    const { root, channel } = useAnnouncement(
        form.formState.isSubmitSuccessful && !form.formState.errors.root?.credential ? confirmation : '',
        'event'
    );

    /** Returns the credential outcome while preserving cancellation of token-storage cleanup. */
    async function verify({
        signal,
        token: resetToken,
    }: VerificationRequest): Promise<{ status: 'verified' } | { status: 'error' } | undefined> {
        // Exchange the URL credential, or recover the already established setup cookie.
        const request = resetToken
            ? api('/api/v1/auth/reset-password/verify', {
                  json: { token: resetToken },
                  method: 'POST',
                  signal,
              })
            : api('/api/v1/auth/reset-password/setup', { signal });

        // Handle only transport failures as invalid credentials.
        try {
            await request;
        } catch (cause: unknown) {
            if (signal.aborted) return;

            if (!isBadTokenError(cause)) throw cause;
            sessionStorage.removeItem(PASSWORD_RESET_TOKEN_KEY);

            return { status: 'error' };
        }

        // Clear the accepted credential only while verification is still active.
        if (signal.aborted) return;
        sessionStorage.removeItem(PASSWORD_RESET_TOKEN_KEY);

        return { status: 'verified' };
    }

    const { verification } = useVerification(token, verify);

    const pageMetadata = <title>Set a New Password | LongLink</title>;

    // Invalid and expired credentials require a replacement email.
    if (verification?.status === 'error' || form.formState.errors.root?.credential) {
        return (
            <AuthLayout
                title="Set a new password"
                description="This password reset link is invalid or expired. Request a new link to continue."
            >
                {pageMetadata}
                <Divider />
                <Button href="/auth/forgot-password" label="Request another reset link" variant="primary" />
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title="Set a new password" description="Choose a new password for your LongLink account.">
            {pageMetadata}
            <Divider />
            {verification?.status !== 'verified' ? (
                <Button isLoading label="Reset password" variant="primary" />
            ) : form.formState.isSubmitSuccessful ? (
                <Stack gap={4}>
                    <div ref={root} className="native-auth-banner" data-status="success">
                        <CircleCheck aria-hidden="true" className="size-5 shrink-0" />
                        <p>{confirmation}</p>
                        <span ref={channel} className="sr-only" role="status" aria-atomic="true" />
                    </div>
                    <Button href="/login" label="Back to sign in" variant="primary" />
                </Stack>
            ) : (
                <form
                    noValidate
                    action={() =>
                        form.handleSubmit(async (payload) => {
                            // Publish the saved result only after the password change succeeds.
                            try {
                                await api('/api/v1/auth/reset-password', { json: payload, method: 'POST' });
                            } catch (cause: unknown) {
                                if (!isBadTokenError(cause)) throw cause;
                                form.setError('root.credential', { type: 'expired' });

                                return;
                            }
                        })()
                    }
                >
                    <Stack gap={4}>
                        <TextField
                            control={form.control}
                            name="password"
                            required
                            label="New password"
                            type="password"
                        />
                        <Button label="Reset password" type="submit" variant="primary" />
                    </Stack>
                </form>
            )}
        </AuthLayout>
    );
}
