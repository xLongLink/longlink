import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Separator } from '@ui/separator';
import { useState, type SyntheticEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';

import { Wordmark } from '@/components/Wordmark';
import { useUser } from '@/hooks/use-user';

type SignInCardProps = {
    redirectTo: string;
};

/** Renders the shared username and password sign-in card. */
export function SignInCard({ redirectTo }: SignInCardProps) {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { accounts, activateAccount, loginWithCredentials } = useUser();

    /** Submits credentials, refreshes the session cache, and redirects. */
    async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSubmitting(true);

        try {
            await loginWithCredentials({ username, password });
            navigate(redirectTo, { replace: true });
        } catch (loginError) {
            toast.error(loginError instanceof Error ? loginError.message : 'Login failed');
        } finally {
            setIsSubmitting(false);
        }
    }

    /** Activates one saved account and returns to the requested page. */
    async function handleAccountSelect(oidc: string) {
        try {
            await activateAccount(oidc);
            navigate(redirectTo, { replace: true });
        } catch (accountError) {
            toast.error(accountError instanceof Error ? accountError.message : 'Failed to open account');
        }
    }

    /** Redirects the browser to the OIDC login endpoint. */
    function handleProviderSignIn(provider: 'github' | 'google') {
        window.location.assign(`/auth/login/oidc?provider=${provider}`);
    }

    const hasSavedAccounts = accounts.items.length > 0;

    return (
        <div className={`mx-auto w-full space-y-6 ${hasSavedAccounts ? 'max-w-5xl' : 'max-w-sm'}`}>
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

                <div className={`grid gap-4 ${hasSavedAccounts ? 'lg:grid-cols-[24rem_24rem] lg:items-start lg:justify-center' : ''}`}>
                    <div className="space-y-4">
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
                                    className="w-full"
                                    disabled={isSubmitting || username.length === 0 || password.length === 0}
                                >
                                    {isSubmitting ? 'Signing in...' : 'Continue with Email'}
                                </Button>
                            </form>
                        ) : (
                            <>
                                <Button type="button" variant="outline" className="w-full" onClick={() => setShowEmailForm(true)}>
                                    Continue with Email
                                </Button>
                                <Button type="button" variant="outline" className="w-full" onClick={() => handleProviderSignIn('github')}>
                                    Continue with GitHub
                                </Button>
                                <Button type="button" variant="outline" className="w-full" onClick={() => handleProviderSignIn('google')}>
                                    Continue with Google
                                </Button>
                            </>
                        )}
                    </div>

                    {hasSavedAccounts ? (
                        <div className="space-y-2">
                            {accounts.items.map((account) => (
                                <button
                                    key={account.oidc}
                                    type="button"
                                    className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-border/70 px-3 py-2 text-left transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                                    onClick={() => void handleAccountSelect(account.oidc)}
                                >
                                    <Avatar className="size-9">
                                        <AvatarImage src={account.avatar} alt={`${account.name} profile`} />
                                        <AvatarFallback>{account.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-foreground">{account.name}</p>
                                        <p className="truncate text-xs text-muted-foreground">{account.email}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>

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
