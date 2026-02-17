import { Chrome, Github, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { apiFetch, getApiBaseUrl } from '@/lib/api';
import { useUser } from '@/hooks/use-user';

type LoginMethodsResponse = {
    methods?: string[];
};

export default function Login() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isLoading } = useUser();
    const apiBaseUrl = getApiBaseUrl();
    const [availableMethods, setAvailableMethods] = useState<string[]>([]);

    const getDefaultReturnTo = () => {
        const referrer = document.referrer;
        if (!referrer) {
            return '/';
        }

        try {
            const referrerUrl = new URL(referrer);
            if (referrerUrl.origin !== window.location.origin) {
                return '/';
            }
            const referrerPath = `${referrerUrl.pathname}${referrerUrl.search}${referrerUrl.hash}`;
            return referrerPath.startsWith('/login') ? '/' : referrerPath;
        } catch {
            return '/';
        }
    };

    const searchParams = new URLSearchParams(location.search);
    const queryReturnTo = searchParams.get('return_to');
    const returnTo = (() => {
        if (!queryReturnTo || !queryReturnTo.startsWith('/')) {
            return getDefaultReturnTo();
        }
        return queryReturnTo.startsWith('/login')
            ? getDefaultReturnTo()
            : queryReturnTo;
    })();

    useEffect(() => {
        if (!isLoading && user) {
            navigate(returnTo);
        }
    }, [isLoading, navigate, returnTo, user]);

    useEffect(() => {
        let isMounted = true;

        const loadLoginMethods = async () => {
            try {
                const data = await apiFetch<LoginMethodsResponse>('/login');
                if (isMounted) {
                    setAvailableMethods(data.methods ?? []);
                }
            } catch {
                if (isMounted) {
                    setAvailableMethods([]);
                }
            }
        };

        loadLoginMethods();

        return () => {
            isMounted = false;
        };
    }, []);

    const hasGoogleMethod = availableMethods.includes('google');
    const hasGithubMethod = availableMethods.includes('github');

    const handleGithubLogin = () => {
        window.location.href = `${apiBaseUrl}/login/github`;
    };

    return (
        <div className="flex min-h-screen items-center justify-center px-6 py-12 text-white">
            <Card className="w-full max-w-md border-white/10 bg-white/5">
                <CardContent className="space-y-6 p-8">
                    <div className="space-y-2 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/20 text-blue-300">
                            <Layers className="h-6 w-6" />
                        </div>
                        <h1 className="text-2xl font-semibold">Welcome back</h1>
                        <p className="text-sm text-white/60">
                            Choose a provider to continue to ViaVai.
                        </p>
                    </div>

                    <div className="grid gap-3">
                        <Button
                            className="h-11 gap-2 bg-white text-slate-900 hover:bg-white/90"
                            disabled={!hasGoogleMethod}
                        >
                            <Chrome className="h-4 w-4" />
                            Login with Google
                        </Button>
                        <Button
                            variant="outline"
                            className="h-11 gap-2"
                            disabled={!hasGithubMethod}
                            onClick={handleGithubLogin}
                        >
                            <Github className="h-4 w-4" />
                            Login with GitHub
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
