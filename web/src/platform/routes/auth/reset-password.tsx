import { z } from 'zod';
import { TextField } from './field';
import type { ReactNode } from 'react';
import { api, ApiError } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { AuthLayout } from './auth-layout';
import { CircleCheck } from 'lucide-react';
import { passwordSchema } from './validation';
import { useSubmit } from '@/lib/hooks/use-submit';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@/components/longlink/action/link';
import { Separator } from '@/components/shadcn/separator';
import { Stack } from '@/components/longlink/layout/stack';
import { Button } from '@/components/longlink/action/button';
import { useVerification } from '@/lib/hooks/use-verification';

const PASSWORD_RESET_TOKEN_KEY = 'longlink.password-reset.token';

const resetPasswordSchema = z.object({ password: passwordSchema });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/** Returns whether an API error reports an invalid or expired reset token. */
function isBadTokenError(cause: unknown): boolean {
    return cause instanceof ApiError && cause.status === 400;
}

/** Accepts a password reset token and saves a new password. */
export default function ResetPassword() {
    const form = useForm<ResetPasswordValues>({
        defaultValues: { password: '' },
        resolver: zodResolver(resetPasswordSchema)
    });

    const confirmation = 'Your password has been reset. You can now sign in.';

    const { verification } = useVerification(PASSWORD_RESET_TOKEN_KEY, async ({ signal, token: resetToken }) => {
        if (resetToken) {
            await api('/api/v1/auth/reset-password/verify', { json: { token: resetToken }, method: 'POST', signal });
        } else {
            await api('/api/v1/auth/reset-password/setup', { signal });
        }
    });
    const save = useSubmit(
        async (payload: ResetPasswordValues) => {
            try {
                await api('/api/v1/auth/reset-password', { json: payload, method: 'POST' });
            } catch (cause: unknown) {
                if (!isBadTokenError(cause)) throw cause;
                form.setError('root.credential', { type: 'expired' });
            }
        },
        { onError: (error) => form.setError('root', { message: error.message }) }
    );

    let description = 'Choose a new password for your LongLink account.';
    let body: ReactNode;

    // Invalid and expired credentials require a replacement email.
    if (verification?.status === 'error' || form.formState.errors.root?.credential) {
        description = 'This password reset link is invalid or expired. Request a new link to continue.';
        body = (
            <Link href="/auth/forgot-password" variant="primary">
                Request another reset link
            </Link>
        );
    } else if (verification?.status !== 'verified') {
        body = (
            <Button disabled aria-busy="true">
                Reset password
            </Button>
        );
    } else if (form.formState.isSubmitSuccessful) {
        body = (
            <Stack gap={4}>
                <Stack
                    direction="horizontal"
                    gap={2}
                    align="start"
                    paddingInline={4}
                    paddingBlock={3}
                    className="native-auth-banner max-w-full rounded-xl bg-success/10 font-[inherit] text-success-foreground forced-colors:outline forced-colors:outline-offset-[-1px] forced-colors:outline-[CanvasText]"
                    data-status="success"
                >
                    <CircleCheck aria-hidden="true" className="size-5 shrink-0" />
                    <p
                        role="status"
                        aria-atomic="true"
                        className="m-0 min-w-0 text-sm leading-(--text-sm--line-height) font-semibold wrap-anywhere"
                    >
                        {confirmation}
                    </p>
                </Stack>
                <Link href="/login" variant="primary">
                    Back to sign in
                </Link>
            </Stack>
        );
    } else {
        body = (
            <form noValidate onSubmit={form.handleSubmit(save)} aria-busy={form.formState.isSubmitting}>
                <Stack gap={4}>
                    <TextField
                        {...form.register('password')}
                        error={form.formState.errors.password?.message}
                        required
                        label="New password"
                        type="password"
                    />
                    <Button type="submit">Reset password</Button>
                </Stack>
            </form>
        );
    }

    return (
        <AuthLayout title="Set a new password" description={description}>
            <title>Set a New Password | LongLink</title>
            <Separator />
            {body}
        </AuthLayout>
    );
}
