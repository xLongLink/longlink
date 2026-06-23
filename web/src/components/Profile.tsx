import { useUser } from '@/hooks/use-user';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@ui/dropdown-menu';
import {
    Activity,
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
import { Link, useNavigate } from 'react-router';

/** Renders a user profile dropdown with authentication actions. */
export function UserProfile() {
    const navigate = useNavigate();
    const { user, signOut } = useUser();

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
        await signOut();
        navigate('/');
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
                    <DropdownMenuLabel className="flex items-center gap-2">
                        <Avatar className="size-9">
                            <AvatarImage src={avatarUrl} alt={`${username} profile`} />
                            <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-foreground">{username}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">{fullName}</p>
                        </div>
                    </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuGroup>
                    <DropdownMenuItem
                        render={<Link to="/organizations" className="flex w-full items-center gap-2 text-inherit" />}
                        className="cursor-pointer p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:backdrop-blur-sm hover:text-accent-foreground dark:hover:text-white focus:bg-accent/10 focus:backdrop-blur-sm focus:text-accent-foreground dark:focus:text-white"
                    >
                        <Building2 className="h-4 w-4" />
                        Organizations
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        render={<Link to="/settings" className="flex w-full items-center gap-2 text-inherit" />}
                        className="cursor-pointer p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:backdrop-blur-sm hover:text-accent-foreground dark:hover:text-white focus:bg-accent/10 focus:backdrop-blur-sm focus:text-accent-foreground dark:focus:text-white"
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
                        className="cursor-pointer p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:backdrop-blur-sm hover:text-accent-foreground dark:hover:text-white focus:bg-accent/10 focus:backdrop-blur-sm focus:text-accent-foreground dark:focus:text-white"
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
                                className="cursor-pointer p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:backdrop-blur-sm hover:text-accent-foreground dark:hover:text-white focus:bg-accent/10 focus:backdrop-blur-sm focus:text-accent-foreground dark:focus:text-white"
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
                                className="cursor-pointer p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:backdrop-blur-sm hover:text-accent-foreground dark:hover:text-white focus:bg-accent/10 focus:backdrop-blur-sm focus:text-accent-foreground dark:focus:text-white"
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
                                className="cursor-pointer p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:backdrop-blur-sm hover:text-accent-foreground dark:hover:text-white focus:bg-accent/10 focus:backdrop-blur-sm focus:text-accent-foreground dark:focus:text-white"
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
                                className="cursor-pointer p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:backdrop-blur-sm hover:text-accent-foreground dark:hover:text-white focus:bg-accent/10 focus:backdrop-blur-sm focus:text-accent-foreground dark:focus:text-white"
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
                                className="cursor-pointer p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:backdrop-blur-sm hover:text-accent-foreground dark:hover:text-white focus:bg-accent/10 focus:backdrop-blur-sm focus:text-accent-foreground dark:focus:text-white"
                            >
                                <Database className="h-4 w-4" />
                                Database
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                render={
                                    <Link to="/admin/storage" className="flex w-full items-center gap-2 text-inherit" />
                                }
                                className="cursor-pointer p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:backdrop-blur-sm hover:text-accent-foreground dark:hover:text-white focus:bg-accent/10 focus:backdrop-blur-sm focus:text-accent-foreground dark:focus:text-white"
                            >
                                <HardDrive className="h-4 w-4" />
                                Storage
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                render={
                                    <Link to="/admin/compute" className="flex w-full items-center gap-2 text-inherit" />
                                }
                                className="cursor-pointer p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:backdrop-blur-sm hover:text-accent-foreground dark:hover:text-white focus:bg-accent/10 focus:backdrop-blur-sm focus:text-accent-foreground dark:focus:text-white"
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
                                className="cursor-pointer p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:backdrop-blur-sm hover:text-accent-foreground dark:hover:text-white focus:bg-accent/10 focus:backdrop-blur-sm focus:text-accent-foreground dark:focus:text-white"
                            >
                                <Activity className="h-4 w-4" />
                                Operations
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </>
                ) : null}
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem
                    className="cursor-pointer p-2 text-destructive transition-colors hover:bg-destructive/10 focus:text-destructive"
                    onClick={handleSignOut}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
