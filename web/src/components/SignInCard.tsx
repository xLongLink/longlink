import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

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
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    /** Submits credentials, refreshes the session cache, and redirects. */
    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
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
            setError(loginError instanceof Error ? loginError.message : 'Login failed');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="space-y-2 text-center">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">LongLink</p>
                <h1 className="text-2xl font-medium">Sign in</h1>
                <p className="text-sm text-muted-foreground">Use your username and password to continue.</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                    <Label htmlFor="signin-username">Username</Label>
                    <Input
                        id="signin-username"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        autoComplete="username"
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

                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting || username.length === 0 || password.length === 0}
                >
                    {isSubmitting ? 'Signing in...' : 'Sign in'}
                </Button>
            </form>
        </div>
    );
}
