import { useTranslation } from '@/lib/i18n';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';
import type { TFunction } from 'i18next';
import { MoreVertical } from 'lucide-react';
import { toast } from 'sonner';

import { DataTable } from '@/components/DataTable';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUsers } from '@/hooks/use-users';
import type { ApiUserSummary } from '@/lib/types';
import { getInitials } from '@/lib/utils';

/** Builds localized admin user table columns. */
function createUserColumns(t: TFunction): Array<ColumnDef<ApiUserSummary>> {
    return [
        {
            id: 'user',
            header: t('columns.user'),
            meta: { className: 'pr-1' },
            cell: ({ row }) => {
                const user = row.original;

                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">{user.name}</div>
                            <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'id',
            header: t('columns.id'),
            cell: ({ row, getValue }) => (
                <div className="flex flex-col leading-tight text-left">
                    <span className="font-medium text-foreground">#{getValue<number>()}</span>
                    <span className="text-xs text-muted-foreground">OIDC: {row.original.oidc ?? '—'}</span>
                </div>
            ),
            meta: { className: 'w-28 pl-1 text-left' },
        },
        {
            accessorKey: 'role',
            header: t('columns.role'),
            cell: ({ getValue }) => (
                <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                    {getValue<string>()}
                </span>
            ),
            meta: { className: 'w-32' },
        },
        {
            id: 'actions',
            header: t('columns.action'),
            meta: { className: 'w-24 text-right' },
            cell: ({ row }) => {
                const user = row.original;

                return (
                    <div className="flex justify-end">
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        className="cursor-pointer"
                                        aria-label={t('common.openActionsFor', { name: user.name })}
                                    />
                                }
                            >
                                <MoreVertical className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => {
                                        void navigator.clipboard.writeText(user.email);
                                        toast.success(t('admin.emailCopied'));
                                    }}
                                >
                                    {t('admin.copyEmail')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    disabled={!user.oidc}
                                    onClick={() => {
                                        if (!user.oidc) {
                                            return;
                                        }

                                        void navigator.clipboard.writeText(user.oidc);
                                        toast.success(t('admin.oidcCopied'));
                                    }}
                                >
                                    {t('admin.copyOidc')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
        },
    ];
}

/** Renders the admin users page. */
export default function AdminUsers() {
    const { t } = useTranslation();
    const { items: users, error, isLoading } = useUsers();
    const userColumns = createUserColumns(t);

    return (
        <div className="space-y-6">
            <Hero icon="users">
                <div>
                    <HeroTitle>{t('admin.usersTitle')}</HeroTitle>
                    <HeroDescription>{t('admin.usersDescription')}</HeroDescription>
                </div>
            </Hero>
            <DataTable columns={userColumns} data={users} error={error} isLoading={isLoading} />
        </div>
    );
}
