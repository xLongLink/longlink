import { useUser } from '@/hooks/use-user';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@ui/dropdown-menu';
import {
    Activity,
    BookOpen,
    Boxes,
    ArrowRightLeft,
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

const profileDropdownMenuItemClassName =
    'cursor-pointer p-2 text-muted-foreground transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground';

const profileDropdownMenuAvatarItemClassName =
    'cursor-pointer items-center gap-3 p-2 text-muted-foreground transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground data-highlighted:[&_p]:text-accent-foreground data-highlighted:[&_svg]:text-accent-foreground';

const profileDropdownMenuDestructiveItemClassName =
    'cursor-pointer p-2 text-destructive transition-colors data-highlighted:bg-destructive/10 data-highlighted:text-destructive';

/** Renders a user profile dropdown with authentication actions. */
export function UserProfile() {
    const { user, signOut, switchAccount } = useUser();

    if (!user) {
        return null;
    }

    const username = user.name;
    const fullName = user.email;
    const avatarUrl = user.avatar;
    const isPrivileged = user.role !== 'user';

    /**
     * Signs the current user out and redirects to home.
     */
    const handleSignOut = async () => {
        try {
            await signOut();
        } catch {
            toast.error('Failed to sign out');
        }
    };

    /** Clears the active user so another account can be selected. */
    const handleSwitchAccount = async () => {
        try {
            await switchAccount();
        } catch {
            toast.error('Failed to switch account');
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="group flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background/70 transition hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
                <Avatar className="size-8">
                    <AvatarImage src={avatarUrl} alt={`${username} profile`} />
                    <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2">
                <DropdownMenuGroup>
                    <DropdownMenuItem
                        className={profileDropdownMenuAvatarItemClassName}
                        onClick={() => void handleSwitchAccount()}
                    >
                        <Avatar className="size-9">
                            <AvatarImage src={avatarUrl} alt={`${username} profile`} />
                            <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">{username}</p>
                            <p className="truncate text-xs text-muted-foreground">{fullName}</p>
                        </div>
                        <ArrowRightLeft className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuGroup>
                    <DropdownMenuItem
                        render={<Link to="/organizations" className="flex w-full items-center gap-2 text-inherit" />}
                        className={profileDropdownMenuItemClassName}
                    >
                        <Building2 className="h-4 w-4" />
                        Organizations
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        render={<Link to="/settings" className="flex w-full items-center gap-2 text-inherit" />}
                        className={profileDropdownMenuItemClassName}
                    >
                        <Settings2 className="h-4 w-4" />
                        Settings
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
                        className={profileDropdownMenuItemClassName}
                    >
                        <BookOpen className="h-4 w-4" />
                        Documentation
                        <ExternalLink className="ml-auto size-3.5 shrink-0" aria-hidden="true" />
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                {isPrivileged ? (
                    <>
                        <DropdownMenuSeparator className="my-2" />
                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                render={
                                    <Link to="/admin/users" className="flex w-full items-center gap-2 text-inherit" />
                                }
                                className={profileDropdownMenuItemClassName}
                            >
                                <Users className="h-4 w-4" />
                                Users
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                render={
                                    <Link
                                        to="/admin/applications"
                                        className="flex w-full items-center gap-2 text-inherit"
                                    />
                                }
                                className={profileDropdownMenuItemClassName}
                            >
                                <Boxes className="h-4 w-4" />
                                Applications
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                render={
                                    <Link
                                        to="/admin/organizations"
                                        className="flex w-full items-center gap-2 text-inherit"
                                    />
                                }
                                className={profileDropdownMenuItemClassName}
                            >
                                <Building2 className="h-4 w-4" />
                                Organizations
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                render={
                                    <Link
                                        to="/admin/locations"
                                        className="flex w-full items-center gap-2 text-inherit"
                                    />
                                }
                                className={profileDropdownMenuItemClassName}
                            >
                                <MapPin className="h-4 w-4" />
                                Locations
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                render={
                                    <Link
                                        to="/admin/database"
                                        className="flex w-full items-center gap-2 text-inherit"
                                    />
                                }
                                className={profileDropdownMenuItemClassName}
                            >
                                <Database className="h-4 w-4" />
                                Database
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                render={
                                    <Link to="/admin/storage" className="flex w-full items-center gap-2 text-inherit" />
                                }
                                className={profileDropdownMenuItemClassName}
                            >
                                <HardDrive className="h-4 w-4" />
                                Storage
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                render={
                                    <Link to="/admin/compute" className="flex w-full items-center gap-2 text-inherit" />
                                }
                                className={profileDropdownMenuItemClassName}
                            >
                                <Cpu className="h-4 w-4" />
                                Compute
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                render={
                                    <Link
                                        to="/admin/operations"
                                        className="flex w-full items-center gap-2 text-inherit"
                                    />
                                }
                                className={profileDropdownMenuItemClassName}
                            >
                                <Activity className="h-4 w-4" />
                                Operations
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </>
                ) : null}
                {isPrivileged ? <DropdownMenuSeparator className="my-2" /> : null}
                <DropdownMenuItem
                    className={profileDropdownMenuDestructiveItemClassName}
                    onClick={handleSignOut}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
