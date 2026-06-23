import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Separator } from '@ui/separator';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';

import { Wordmark } from '@/components/Wordmark';
import { apiQueryKey, fetchApiJson } from '@/lib/api';

type SignInCardProps = {
    redirectTo: string;
};

/** Renders the shared username and password sign-in card. */
export function SignInCard({ redirectTo }: SignInCardProps) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    /** Submits credentials, refreshes the session cache, and redirects. */
    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSubmitting(true);

        try {
            await fetchApiJson<{ ok: boolean }>('/auth/login/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    password,
                }),
            });

            await queryClient.invalidateQueries({ queryKey: apiQueryKey('/api/me') });
            navigate(redirectTo, { replace: true });
        } catch (loginError) {
            toast.error(loginError instanceof Error ? loginError.message : 'Login failed');
        } finally {
            setIsSubmitting(false);
        }
    }

    /** Redirects the browser to the OIDC login endpoint. */
    function handleProviderSignIn(provider: 'github' | 'google') {
        window.location.assign(`/auth/login/oidc?provider=${provider}`);
    }

    return (
        <div className="mx-auto w-full max-w-sm space-y-6">
            <div className="space-y-6">
                <div className="space-y-4 text-center">
                    <div className="space-y-2">
                        <h1 className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-2xl font-medium">
                            <span>Welcome to</span>
                            <Wordmark className="text-2xl align-baseline" />
                        </h1>
                    </div>

                    {showEmailForm ? (
                        <button
                            type="button"
                            className="text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                            onClick={() => setShowEmailForm(false)}
                        >
                            Back
                        </button>
                    ) : null}
                </div>

                {showEmailForm ? (
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <Label htmlFor="signin-email">Email</Label>
                            <Input
                                id="signin-email"
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                                autoComplete="email"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="signin-password">Password</Label>
                            <Input
                                id="signin-password"
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                autoComplete="current-password"
                                disabled={isSubmitting}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="mx-auto w-full max-w-sm"
                            disabled={isSubmitting || username.length === 0 || password.length === 0}
                        >
                            {isSubmitting ? 'Signing in...' : 'Continue with Email'}
                        </Button>
                    </form>
                ) : null}

                {!showEmailForm ? (
                    <div className="space-y-3">
                        <Button
                            type="button"
                            variant="outline"
                            className="mx-auto w-full max-w-sm"
                            onClick={() => setShowEmailForm(true)}
                        >
                            Continue with Email
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="mx-auto w-full max-w-sm"
                            onClick={() => handleProviderSignIn('github')}
                        >
                            Continue with GitHub
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="mx-auto w-full max-w-sm"
                            onClick={() => handleProviderSignIn('google')}
                        >
                            Continue with Google
                        </Button>
                    </div>
                ) : null}

                <Separator />

                <p className="mx-auto max-w-sm text-center text-xs text-muted-foreground">
                    <span>By continuing, you agree to our</span>
                    <br />
                    <Link className="underline underline-offset-4 hover:text-foreground" to="/terms">
                        Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link className="underline underline-offset-4 hover:text-foreground" to="/privacy">
                        Privacy Policy
                    </Link>
                    .
                </p>
            </div>
        </div>
    );
}
