import { Blocks, FolderGit2, Users } from 'lucide-react';
import Hero from '@/longlink/Hero';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';
import { useApps } from '@/hooks/use-apps';
import { useUsers } from '@/hooks/use-users';

export default function Overview() {
    const { data: apps = [], isLoading: isAppsLoading } = useApps();
    const { users, isLoading: isUsersLoading } = useUsers();

    return (
        <div className="space-y-6">
            <Hero
                title="Overview"
                subtitle="A high-level snapshot of your organization workspace."
                icon="bar-chart-3"
            />

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardDescription className="flex items-center gap-2 text-white/60">
                            <Blocks className="h-4 w-4" />
                            Tools
                        </CardDescription>
                        <CardTitle>{isAppsLoading ? 'Loading…' : `${apps.length}`}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-white/60">
                        Manage the apps and services available to your organization.
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardDescription className="flex items-center gap-2 text-white/60">
                            <Users className="h-4 w-4" />
                            People
                        </CardDescription>
                        <CardTitle>{isUsersLoading ? 'Loading…' : `${users.length}`}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-white/60">
                        Keep track of teammates, collaborators, and workspace access.
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardDescription className="flex items-center gap-2 text-white/60">
                            <FolderGit2 className="h-4 w-4" />
                            Processes
                        </CardDescription>
                        <CardTitle>Coming next</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-white/60">
                        Organize repeatable workflows and shared operational steps.
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
