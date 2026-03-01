import { AppWindow, PlusCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import Hero from '@/components/longlink/Hero';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type Application = {
    name: string;
    slug: string;
    owner: string;
    runtime: string;
    status: 'Active';
};

export default function Applications() {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [owner, setOwner] = useState('');
    const [runtime, setRuntime] = useState('Python SDK');
    const [applications, setApplications] = useState<Application[]>([]);

    const canCreate = useMemo(() => {
        return (
            name.trim().length > 0 &&
            slug.trim().length > 0 &&
            owner.trim().length > 0 &&
            runtime.trim().length > 0
        );
    }, [name, owner, runtime, slug]);

    const onCreate = () => {
        if (!canCreate) {
            return;
        }

        setApplications((current) => [
            {
                name: name.trim(),
                slug: slug.trim(),
                owner: owner.trim(),
                runtime: runtime.trim(),
                status: 'Active',
            },
            ...current,
        ]);

        setName('');
        setSlug('');
        setOwner('');
        setRuntime('Python SDK');
    };

    return (
        <div className="space-y-6">
            <Hero
                title="Application Settings"
                subtitle="Control app defaults, permissions, and lifecycle settings"
                icon="settings"
                action="Create app"
            >
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Create application</DialogTitle>
                        <DialogDescription>
                            Register a new application to make it available for
                            modules, storage bindings, and runtime deployment.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 md:grid-cols-2">
                        <Input
                            placeholder="Application name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                        />
                        <Input
                            placeholder="Slug"
                            value={slug}
                            onChange={(event) => setSlug(event.target.value)}
                        />
                        <Input
                            placeholder="Owner"
                            value={owner}
                            onChange={(event) => setOwner(event.target.value)}
                        />
                        <Input
                            placeholder="Runtime"
                            value={runtime}
                            onChange={(event) => setRuntime(event.target.value)}
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button
                            variant="outline"
                            onClick={onCreate}
                            disabled={!canCreate}
                        >
                            <PlusCircle className="h-4 w-4" />
                            Create
                        </Button>
                    </div>
                </DialogContent>
            </Hero>

            <Card className="overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Slug</TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead>Runtime</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {applications.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="py-8 text-center text-muted-foreground"
                                >
                                    No applications registered yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            applications.map((application) => (
                                <TableRow
                                    key={`${application.slug}-${application.owner}`}
                                >
                                    <TableCell className="font-medium">
                                        {application.name}
                                    </TableCell>
                                    <TableCell>{application.slug}</TableCell>
                                    <TableCell>{application.owner}</TableCell>
                                    <TableCell>{application.runtime}</TableCell>
                                    <TableCell>{application.status}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            <Card className="border-dashed p-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                    <AppWindow className="mt-0.5 h-4 w-4" />
                    <p>
                        Applications listed here can be attached to database and
                        storage providers configured in this settings section.
                    </p>
                </div>
            </Card>
        </div>
    );
}
