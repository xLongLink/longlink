import { api } from '@/lib/api';
import { TextField } from './field';
import { useForm } from 'react-hook-form';
import { AuthLayout } from './auth-layout';
import { Mail, CircleCheck } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@/components/longlink/action/link';
import { Stack } from '@/components/longlink/layout/stack';
import { FieldSeparator } from '@/components/shadcn/field';
import { emailPayloadSchema, type EmailPayload } from './validation';

/** Requests a password reset email without disclosing whether an account exists. */
export default function ForgotPassword() {
    const form = useForm<EmailPayload>({ defaultValues: { email: '' }, resolver: zodResolver(emailPayloadSchema) });

    const confirmation = 'If an account exists for that email, password reset instructions are on the way.';

    return (
        <AuthLayout
            title={<span className="text-2xl block text-nowrap text-center">Reset your password</span>}
            description={null}
        >
            <title>Reset Your Password | LongLink</title>
            <FieldSeparator>
                <Link href="/login">Back to sign in</Link>
            </FieldSeparator>
            {form.formState.isSubmitSuccessful ? (
                <Stack gap={4}>
                    <div
                        className="native-auth-banner flex max-w-full items-start gap-2 rounded-xl bg-success/10 px-4 py-3 font-[inherit] text-success-foreground forced-colors:outline forced-colors:outline-offset-[-1px] forced-colors:outline-[CanvasText]"
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
                    </div>
                    <Link href="/login" variant="primary">
                        Back to sign in
                    </Link>
                </Stack>
            ) : (
                <form
                    noValidate
                    action={() =>
                        form.handleSubmit(async (payload) => {
                            // Show the confirmation without disclosing whether an account exists.
                            await api('/api/v1/auth/forgot-password', { json: payload, method: 'POST' });
                        })()
                    }
                >
                    <Stack gap={4}>
                        <TextField
                            control={form.control}
                            name="email"
                            autoComplete="email"
                            required
                            label="Email"
                            type="email"
                        />
                        <Button type="submit" variant="primary" className="w-full">
                            <Mail aria-hidden="true" size={16} />
                            Send reset email
                        </Button>
                    </Stack>
                </form>
            )}
            <FieldSeparator>
                Troubles? <Link href="mailto:info@longlink.dev">Contact US</Link>
            </FieldSeparator>
        </AuthLayout>
    );
}
