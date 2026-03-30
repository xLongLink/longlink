import { useMemo, useState } from 'react';
import { CreateApplicationDialog } from '@/components/dialogs';
import AppButton from '@/longlink/Button';
import Hero from '@/longlink/Hero';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/ui/table';

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
            >
                <div className="flex items-center gap-2">
                    <Button variant="outline">Connect app</Button>

                    <AppButton variant="outline" text="Create app">
                        <CreateApplicationDialog
                            name={name}
                            slug={slug}
                            owner={owner}
                            runtime={runtime}
                            canCreate={canCreate}
                            onNameChange={setName}
                            onSlugChange={setSlug}
                            onOwnerChange={setOwner}
                            onRuntimeChange={setRuntime}
                            onCreate={onCreate}
                        />
                    </AppButton>
                </div>
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
        </div>
    );
}
