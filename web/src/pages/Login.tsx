import { useUser } from '@/hooks/use-user';
import { apiUrl, fetchApiJson } from '@/lib/api';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

/** Renders the username/password login page. */
export default function Login() {
    const { user, isLoading } = useUser();
    const location = useLocation();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const nextPath = new URLSearchParams(location.search).get('next');
    const redirectTo = nextPath?.startsWith('/') ? nextPath : '/organizations';

    useEffect(() => {
        if (!user) {
            return;
        }

        navigate(redirectTo, { replace: true });
    }, [navigate, redirectTo, user]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            await fetchApiJson<{ ok: boolean }>(apiUrl('/auth/login/password'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    username,
                    password,
                }),
            });

            navigate(redirectTo, { replace: true });
        } catch (loginError) {
            setError(loginError instanceof Error ? loginError.message : 'Login failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return null;
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
            <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm">
                <div className="space-y-2 text-center">
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">LongLink</p>
                    <h1 className="text-2xl font-medium">Sign in</h1>
                    <p className="text-sm text-muted-foreground">Use your username and password to continue.</p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <Label htmlFor="login-username">Username</Label>
                        <Input
                            id="login-username"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            autoComplete="username"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <Input
                            id="login-password"
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

                <div className="text-center text-sm text-muted-foreground">
                    <Link to="/" className="font-medium text-accent hover:underline">
                        Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
}
