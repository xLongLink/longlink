import { useUser } from '@/hooks/use-user';
import { useTranslation } from '@/lib/i18n';
import { getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Activity,
    ArrowRightLeft,
    BookOpen,
    Boxes,
    Building2,
    Cpu,
    Database,
    ExternalLink,
    HardDrive,
    LogOut,
    MapPin,
    Settings2,
    Users,
} from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';

/** Renders a user profile dropdown with authentication actions. */
export function UserProfile() {
    const { t } = useTranslation();
    const { user, signOut, switchAccount } = useUser();

    // Hide the profile menu until a user is loaded.
    if (!user) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="group flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background/70 transition hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
                <Avatar className="size-8">
                    <AvatarImage src={user.avatar} alt={`${user.name} profile`} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2">
                <DropdownMenuGroup>
                    <DropdownMenuItem
                        className="cursor-pointer items-center gap-3 p-2 text-muted-foreground transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground data-highlighted:[&_p]:text-accent-foreground data-highlighted:[&_svg]:text-accent-foreground"
                        onClick={() =>
                            void switchAccount().catch(() => {
                                toast.error(t('auth.switchAccountFailed'));
                            })
                        }
                    >
                        <Avatar className="size-9">
                            <AvatarImage src={user.avatar} alt={`${user.name} profile`} />
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <ArrowRightLeft className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuGroup>
                    <DropdownMenuItem
                        render={<Link to="/organizations" className="flex w-full items-center gap-2 text-inherit" />}
                        className="cursor-pointer p-2 text-muted-foreground transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                    >
                        <Building2 className="h-4 w-4" />
                        {t('profile.organizations')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        render={<Link to="/settings" className="flex w-full items-center gap-2 text-inherit" />}
                        className="cursor-pointer p-2 text-muted-foreground transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                    >
                        <Settings2 className="h-4 w-4" />
                        {t('profile.settings')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        render={
                            <Link
                                to="/docs"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex w-full items-center gap-2 text-inherit"
                            />
                        }
                        className="cursor-pointer p-2 text-muted-foreground transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                    >
                        <BookOpen className="h-4 w-4" />
                        {t('common.documentation')}
                        <ExternalLink className="ml-auto size-3.5 shrink-0" aria-hidden="true" />
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                {user.role !== 'user' ? (
                    <>
                        <DropdownMenuSeparator className="my-2" />
                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                render={
                                    <Link to="/admin/users" className="flex w-full items-center gap-2 text-inherit" />
                                }
                                className="cursor-pointer p-2 text-muted-foreground transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                            >
                                <Users className="h-4 w-4" />
                                {t('profile.users')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                render={
                                    <Link
                                        to="/admin/applications"
                                        className="flex w-full items-center gap-2 text-inherit"
                                    />
                                }
                                className="cursor-pointer p-2 text-muted-foreground transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                            >
                                <Boxes className="h-4 w-4" />
                                {t('profile.applications')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                render={
                                    <Link
                                        to="/admin/organizations"
                                        className="flex w-full items-center gap-2 text-inherit"
                                    />
                                }
                                className="cursor-pointer p-2 text-muted-foreground transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                            >
                                <Building2 className="h-4 w-4" />
                                {t('profile.organizations')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                render={
                                    <Link
                                        to="/admin/locations"
                                        className="flex w-full items-center gap-2 text-inherit"
                                    />
                                }
                                className="cursor-pointer p-2 text-muted-foreground transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                            >
                                <MapPin className="h-4 w-4" />
                                {t('profile.locations')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                render={
                                    <Link
                                        to="/admin/database"
                                        className="flex w-full items-center gap-2 text-inherit"
                                    />
                                }
                                className="cursor-pointer p-2 text-muted-foreground transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                            >
                                <Database className="h-4 w-4" />
                                {t('profile.database')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                render={
                                    <Link to="/admin/storage" className="flex w-full items-center gap-2 text-inherit" />
                                }
                                className="cursor-pointer p-2 text-muted-foreground transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                            >
                                <HardDrive className="h-4 w-4" />
                                {t('profile.storage')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                render={
                                    <Link to="/admin/compute" className="flex w-full items-center gap-2 text-inherit" />
                                }
                                className="cursor-pointer p-2 text-muted-foreground transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                            >
                                <Cpu className="h-4 w-4" />
                                {t('profile.compute')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                render={
                                    <Link
                                        to="/admin/operations"
                                        className="flex w-full items-center gap-2 text-inherit"
                                    />
                                }
                                className="cursor-pointer p-2 text-muted-foreground transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                            >
                                <Activity className="h-4 w-4" />
                                {t('profile.operations')}
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </>
                ) : null}
                {user.role !== 'user' ? <DropdownMenuSeparator className="my-2" /> : null}
                <DropdownMenuItem
                    className="cursor-pointer p-2 text-destructive transition-colors data-highlighted:bg-destructive/10 data-highlighted:text-destructive"
                    onClick={() =>
                        void signOut().catch(() => {
                            toast.error(t('profile.signOutFailed'));
                        })
                    }
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('actions.signOut')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
