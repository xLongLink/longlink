import { api } from '@/lib/api';
import { TextField } from './Field';
import { AuthLayout } from './AuthLayout';
import { useForm } from 'react-hook-form';
import { Mail, CircleCheck } from 'lucide-react';
import { Divider } from '@/components/custom/Divider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAnnouncement } from '@/components/custom/announcement';
import { NativeLink as Link } from '@/components/custom/NativeLink';
import { NativeText as Text } from '@/components/custom/NativeText';
import { emailPayloadSchema, type EmailPayload } from './validation';
import { NativeStack as Stack } from '@/components/custom/NativeStack';
import { NativeButton as Button } from '@/components/custom/NativeButton';

/** Requests a password reset email without disclosing whether an account exists. */
export default function ForgotPassword() {
    const form = useForm<EmailPayload>({ defaultValues: { email: '' }, resolver: zodResolver(emailPayloadSchema) });

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
                    <div
                        ref={root}
                        className="native-auth-banner flex max-w-full items-start gap-2 rounded-(--radius-container) bg-(--color-success-muted) px-4 py-3 font-[inherit] text-(--color-on-success-muted) forced-colors:outline forced-colors:outline-offset-[-1px] forced-colors:outline-[CanvasText]"
                        data-status="success"
                    >
                        <CircleCheck aria-hidden="true" className="size-5 shrink-0" />
                        <p className="m-0 min-w-0 text-[length:var(--text-label-size)] leading-(--text-label-leading) font-semibold wrap-anywhere">
                            {confirmation}
                        </p>
                        <span ref={channel} className="sr-only" role="status" aria-atomic="true" />
                    </div>
                    <Button href="/login" label="Back to sign in" variant="default" />
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
                            variant="default"
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
