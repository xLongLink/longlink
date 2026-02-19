import { Plus, Users } from 'lucide-react';
import Hero from '@/components/viavai/Hero';
import Table, { type ApiTableColumn } from '@/components/viavai/Table';
import { Card } from '@/components/ui/card';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { useUsers } from '@/hooks/use-users';

const columns: ApiTableColumn[] = [
    {
        key: 'name',
        label: 'Name',
        cell: '{name}',
    },
    {
        key: 'email',
        label: 'Email',
        cell: '{email}',
    },
];

export default function People() {
    const { users, isLoading, error } = useUsers();

    return (
        <div className="space-y-6">
            <Hero
                title="People"
                subtitle={`${users.length} people`}
                icon="users"
                action="Add Person"
            >
                <Plus className="h-4 w-4" />
            </Hero>

            {isLoading ? (
                <Card className="p-10 text-center text-muted-foreground">
                    Loading people...
                </Card>
            ) : error ? (
                <Card className="p-10 text-center text-destructive">
                    {error}
                </Card>
            ) : users.length === 0 ? (
                <Card className="p-10 text-center">
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Users className="h-5 w-5" />
                            </EmptyMedia>
                            <EmptyTitle>No People Yet</EmptyTitle>
                            <EmptyDescription>
                                Invite teammates and collaborators to start
                                working together.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                </Card>
            ) : (
                <Table data={users} columns={columns} />
            )}
        </div>
    );
}
