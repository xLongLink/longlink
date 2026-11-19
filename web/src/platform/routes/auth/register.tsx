import { api } from '@/lib/api';
import { TextField } from './field';
import { Mail } from 'lucide-react';
import { AuthLayout } from './auth-layout';
import { useSearchParams } from 'react-router';
import { Button } from '@/components/shadcn/button';
import { useForm, useWatch } from 'react-hook-form';
import { useNotification } from '@/lib/notifications';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@/components/longlink/action/link';
import { Separator } from '@/components/shadcn/separator';
import { Stack } from '@/components/longlink/layout/stack';
import { FieldSeparator } from '@/components/shadcn/field';
import { emailPayloadSchema, type EmailPayload } from './validation';

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
            title={<span className="text-2xl block text-nowrap text-center">Welcome to LongLink</span>}
        >
            <title>Create Account | LongLink</title>
            <Stack gap={3}>
                <Separator />
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
                        <Button type="submit" variant="primary" className="w-full">
                            <Mail aria-hidden="true" size={16} />
                            Send registration link
                        </Button>
                    </Stack>
                </form>
                <FieldSeparator>
                    Already have an account? <Link href={`/login${signInSearch}`}>Sign In</Link>
                </FieldSeparator>
            </Stack>
        </AuthLayout>
    );
}
