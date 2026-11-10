import { api } from '@/lib/api';
import { TextField } from './Field';
import { Mail } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { useSearchParams } from 'react-router';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { useToast } from '@astryxdesign/core/Toast';
import { useForm, useWatch } from 'react-hook-form';
import { Divider } from '@astryxdesign/core/Divider';
import { zodResolver } from '@hookform/resolvers/zod';
import { emailPayloadSchema, type EmailPayload } from './validation';

/** Starts stateless account registration with an email verification link. */
export default function Register() {
    const showToast = useToast();
    const [searchParams] = useSearchParams();

    const form = useForm<EmailPayload>({
        defaultValues: { email: searchParams.get('email') ?? '' },
        resolver: zodResolver(emailPayloadSchema),
    });

    const trimmedEmail = useWatch({ control: form.control, name: 'email' }).trim();
    const signInSearch = trimmedEmail ? `?${new URLSearchParams({ email: trimmedEmail })}` : '';

    return (
        <AuthLayout
            description={null}
            title={
                <Text display="block" justify="center" size="2xl" textWrap="nowrap" type="inherit">
                    Welcome to LongLink
                </Text>
            }
        >
            <title>Create Account | LongLink</title>
            <Stack gap={3}>
                <Divider />
                <form
                    action={() =>
                        form.handleSubmit(async (payload) => {
                            // Notify the user only after the email request succeeds.
                            await api('/api/v1/auth/register', { json: payload, method: 'POST' });
                            showToast({ body: 'Check your inbox for the registration link.' });
                        })()
                    }
                >
                    <Stack gap={3}>
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
                            label="Send registration link"
                            type="submit"
                            variant="primary"
                            width="100%"
                        />
                    </Stack>
                </form>
                <Divider
                    label={
                        <>
                            Already have an account?{' '}
                            <Link href={`/login${signInSearch}`} type="inherit" weight="medium">
                                Sign In
                            </Link>
                        </>
                    }
                />
            </Stack>
        </AuthLayout>
    );
}
