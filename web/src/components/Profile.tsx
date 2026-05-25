import { useSignOut, useUser } from '@/hooks/use-user';
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
import { BookOpen, Building2, LogOut, Settings2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router';

/** Renders a user profile dropdown with authentication actions. */
export function UserProfile() {
    const navigate = useNavigate();
    const { data: user } = useUser();
    const { mutateAsync: signOut } = useSignOut();

    if (!user) {
        return null;
    }

    const username = user.name;
    const fullName = user.email;
    const avatarUrl = user.avatar ?? '';

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
                        <div className="">
                            <p className="text-sm font-semibold text-foreground">{username}</p>
                            <p className="text-xs text-muted-foreground">{fullName}</p>
                        </div>
                    </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuGroup>
                    <DropdownMenuItem className="cursor-pointer p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:backdrop-blur-sm hover:text-accent-foreground dark:hover:text-white focus:bg-accent/10 focus:backdrop-blur-sm focus:text-accent-foreground dark:focus:text-white">
                        <Link to="/orgs" className="flex w-full items-center gap-2 text-inherit">
                            <Building2 className="h-4 w-4" />
                            Orgs
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
