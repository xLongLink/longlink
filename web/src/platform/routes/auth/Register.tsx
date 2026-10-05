import { api } from '@/lib/api';
import { AuthLayout } from './AuthLayout';
import { NoIndex } from '@/components/Seo';
import { Link } from '@astryxdesign/core/Link';
import { useSearchParams } from 'react-router';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { useToast } from '@astryxdesign/core/Toast';
import { Divider } from '@astryxdesign/core/Divider';
import { zodResolver } from '@hookform/resolvers/zod';
import { WelcomeTitle } from '@/components/WelcomeTitle';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Controller, useForm, useWatch } from 'react-hook-form';
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
        <AuthLayout description={<Divider label="Please enter your email" />} title={<WelcomeTitle />}>
            <NoIndex title="Create Account | LongLink" />
            <Stack gap={3}>
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
                        <Controller
                            control={form.control}
                            name="email"
                            render={({ field, fieldState }) => (
                                <TextInput
                                    ref={field.ref}
                                    autoComplete="email"
                                    htmlName={field.name}
                                    isRequired
                                    label="Email"
                                    onBlur={field.onBlur}
                                    onChange={field.onChange}
                                    status={
                                        fieldState.error
                                            ? { type: 'error', message: fieldState.error.message }
                                            : undefined
                                    }
                                    type="email"
                                    value={field.value}
                                    width="100%"
                                />
                            )}
                        />
                        <Button label="Send registration link" type="submit" variant="primary" />
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
