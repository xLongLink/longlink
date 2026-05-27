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
import { BookOpen, Building2, Cpu, Database, HardDrive, LogOut, Settings2, Users } from 'lucide-react';
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
                    <DropdownMenuItem className="cursor-pointer p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:backdrop-blur-sm hover:text-accent-foreground dark:hover:text-white focus:bg-accent/10 focus:backdrop-blur-sm focus:text-accent-foreground dark:focus:text-white">
                        <Link to="/organizations" className="flex w-full items-center gap-2 text-inherit">
                            <Building2 className="h-4 w-4" />
                            Organizations
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:backdrop-blur-sm hover:text-accent-foreground dark:hover:text-white focus:bg-accent/10 focus:backdrop-blur-sm focus:text-accent-foreground dark:focus:text-white">
                        <Link to="/settings" className="flex w-full items-center gap-2 text-inherit">
                            <Settings2 className="h-4 w-4" />
                            Settings
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:backdrop-blur-sm hover:text-accent-foreground dark:hover:text-white focus:bg-accent/10 focus:backdrop-blur-sm focus:text-accent-foreground dark:focus:text-white">
                        <Link to="/docs" className="flex w-full items-center gap-2 text-inherit">
                            <BookOpen className="h-4 w-4" />
                            Documentation
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                {user.admin ? (
                    <>
                        <DropdownMenuSeparator className="my-2" />
                        <DropdownMenuGroup>
                            <DropdownMenuItem className="cursor-pointer p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:backdrop-blur-sm hover:text-accent-foreground dark:hover:text-white focus:bg-accent/10 focus:backdrop-blur-sm focus:text-accent-foreground dark:focus:text-white">
                                <Link to="/admin/users" className="flex w-full items-center gap-2 text-inherit">
                                    <Users className="h-4 w-4" />
                                    Users
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:backdrop-blur-sm hover:text-accent-foreground dark:hover:text-white focus:bg-accent/10 focus:backdrop-blur-sm focus:text-accent-foreground dark:focus:text-white">
                                <Link to="/admin/organizations" className="flex w-full items-center gap-2 text-inherit">
                                    <Building2 className="h-4 w-4" />
                                    Organizations
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:backdrop-blur-sm hover:text-accent-foreground dark:hover:text-white focus:bg-accent/10 focus:backdrop-blur-sm focus:text-accent-foreground dark:focus:text-white">
                                <Link to="/admin/database" className="flex w-full items-center gap-2 text-inherit">
                                    <Database className="h-4 w-4" />
                                    Database
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:backdrop-blur-sm hover:text-accent-foreground dark:hover:text-white focus:bg-accent/10 focus:backdrop-blur-sm focus:text-accent-foreground dark:focus:text-white">
                                <Link to="/admin/storage" className="flex w-full items-center gap-2 text-inherit">
                                    <HardDrive className="h-4 w-4" />
                                    Storage
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:backdrop-blur-sm hover:text-accent-foreground dark:hover:text-white focus:bg-accent/10 focus:backdrop-blur-sm focus:text-accent-foreground dark:focus:text-white">
                                <Link to="/admin/compute" className="flex w-full items-center gap-2 text-inherit">
                                    <Cpu className="h-4 w-4" />
                                    Compute
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </>
                ) : null}
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem className="cursor-pointer p-2 text-destructive transition-colors hover:bg-destructive/10 focus:text-destructive">
                    <button type="button" className="flex w-full items-center text-inherit" onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                    </button>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
