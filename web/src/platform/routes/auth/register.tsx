import { api } from '@/lib/api';
import { TextField } from './field';
import { Mail } from 'lucide-react';
import { AuthLayout } from './auth-layout';
import { useSearchParams } from 'react-router';
import { useForm, useWatch } from 'react-hook-form';
import { Divider } from '@/components/custom/divider';
import { useNotification } from '@/lib/notifications';
import { zodResolver } from '@hookform/resolvers/zod';
import { emailPayloadSchema, type EmailPayload } from './validation';
import { NativeLink as Link } from '@/components/custom/native-link';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeButton as Button } from '@/components/custom/native-button';

/** Starts stateless account registration with an email verification link. */
export default function Register() {
    const showNotification = useNotification();
    const [searchParams] = useSearchParams();

    const form = useForm<EmailPayload>({
        defaultValues: { email: searchParams.get('email') ?? '' },
        resolver: zodResolver(emailPayloadSchema)
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
                    noValidate
                    action={() =>
                        form.handleSubmit(async (payload) => {
                            // Notify the user only after the email request succeeds.
                            await api('/api/v1/auth/register', { json: payload, method: 'POST' });
                            showNotification('Check your inbox for the registration link.');
                        })()
                    }
                >
                    <Stack gap={3}>
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
                            label="Send registration link"
                            type="submit"
                            variant="default"
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
