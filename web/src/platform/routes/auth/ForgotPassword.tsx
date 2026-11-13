import { api } from '@/lib/api';
import { TextField } from './Field';
import { AuthLayout } from './AuthLayout';
import { useForm } from 'react-hook-form';
import { Mail, CircleCheck } from 'lucide-react';
import { Divider } from '@/components/ui/Divider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAnnouncement } from '@/components/ui/announcement';
import { NativeLink as Link } from '@/components/ui/NativeLink';
import { NativeText as Text } from '@/components/ui/NativeText';
import { NativeStack as Stack } from '@/components/ui/NativeStack';
import { emailPayloadSchema, type EmailPayload } from './validation';
import { NativeButton as Button } from '@/components/ui/NativeButton';

/** Requests a password reset email without disclosing whether an account exists. */
export default function ForgotPassword() {
    const form = useForm<EmailPayload>({
        defaultValues: { email: '' },
        resolver: zodResolver(emailPayloadSchema),
    });

    const confirmation = 'If an account exists for that email, password reset instructions are on the way.';
    const { root, channel } = useAnnouncement(form.formState.isSubmitSuccessful ? confirmation : '', 'event');

    return (
        <AuthLayout
            title={
                <Text display="block" justify="center" size="2xl" textWrap="nowrap" type="inherit">
                    Reset your password
                </Text>
            }
            description={null}
        >
            <title>Reset Your Password | LongLink</title>
            <Divider
                label={
                    <Link href="/login" type="inherit" weight="medium">
                        Back to sign in
                    </Link>
                }
            />
            {form.formState.isSubmitSuccessful ? (
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
                        <Button
                            icon={<Mail aria-hidden="true" size={16} />}
                            label="Send reset email"
                            type="submit"
                            variant="primary"
                            width="100%"
                        />
                    </Stack>
                </form>
            )}
            <Divider
                label={
                    <>
                        Troubles?{' '}
                        <Link href="mailto:info@longlink.dev" type="inherit" weight="medium">
                            Contact US
                        </Link>
                    </>
                }
            />
        </AuthLayout>
    );
}
