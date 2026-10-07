import { api } from '@/lib/api';
import { useState } from 'react';
import { TextField } from './Field';
import { AuthLayout } from './AuthLayout';
import { useForm } from 'react-hook-form';
import { NoIndex } from '@/components/Seo';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { zodResolver } from '@hookform/resolvers/zod';
import { emailPayloadSchema, type EmailPayload } from './validation';

/** Requests a password reset email without disclosing whether an account exists. */
export default function ForgotPassword() {
    const [sent, setSent] = useState(false);
    const form = useForm<EmailPayload>({
        defaultValues: { email: '' },
        resolver: zodResolver(emailPayloadSchema),
    });

    return (
        <AuthLayout
            title="Reset your password"
            description="Enter your account email and LongLink will send password reset instructions."
        >
            <NoIndex title="Reset Your Password | LongLink" />
            {sent ? (
                <Stack gap={4}>
                    <Banner
                        status="success"
                        title="If an account exists for that email, password reset instructions are on the way."
                    />
                    <Button href="/login" label="Back to sign in" variant="primary" />
                </Stack>
            ) : (
                <>
                    <form
                        action={() =>
                            form.handleSubmit(async (payload) => {
                                // Show the confirmation without disclosing whether an account exists.
                                await api('/api/v1/auth/forgot-password', { json: payload, method: 'POST' });
                                setSent(true);
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
                            <Button label="Send reset email" type="submit" variant="primary" />
                        </Stack>
                    </form>
                    <Text as="p" justify="center" type="supporting">
                        <Link href="/login" type="inherit" weight="medium">
                            Back to sign in
                        </Link>
                    </Text>
                </>
            )}
        </AuthLayout>
    );
}
