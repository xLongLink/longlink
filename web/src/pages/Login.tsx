import { Chrome, Github, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function Login() {
    const apiBaseUrl =
        import.meta.env.VITE_API_BASE_URL?.toString() ??
        'http://localhost:8000';

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
                        <Button className="h-11 gap-2 bg-white text-slate-900 hover:bg-white/90">
                            <Chrome className="h-4 w-4" />
                            Login with Google
                        </Button>
                        <Button
                            variant="outline"
                            className="h-11 gap-2"
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

export default Login;
