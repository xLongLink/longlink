import { api } from '@/lib/api';
import { TextField } from './Field';
import { Mail } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { useForm } from 'react-hook-form';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAnnounce } from '@astryxdesign/core/hooks';
import { emailPayloadSchema, type EmailPayload } from './validation';

/** Requests a password reset email without disclosing whether an account exists. */
export default function ForgotPassword() {
    const announce = useAnnounce();

    const form = useForm<EmailPayload>({
        defaultValues: { email: '' },
        resolver: zodResolver(emailPayloadSchema),
    });

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
                    <Banner
                        status="success"
                        title="If an account exists for that email, password reset instructions are on the way."
                    />
                    <Button href="/login" label="Back to sign in" variant="primary" />
                </Stack>
            ) : (
                <form
                    action={() =>
                        form.handleSubmit(async (payload) => {
                            // Show the confirmation without disclosing whether an account exists.
                            await api('/api/v1/auth/forgot-password', { json: payload, method: 'POST' });
                            announce(
                                'If an account exists for that email, password reset instructions are on the way.'
                            );
                        })()
                    }
                >
                    <Stack gap={4}>
                        <TextField
                            control={form.control}
                            name="email"
                            autoComplete="email"
                            isRequired
                            label="Email"
                            type="email"
                            width="100%"
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
