import { LogOut, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/avatar';
import { useSignOut, useUser } from '@/hooks/use-user';

export function UserProfile() {
    const navigate = useNavigate();
    const { data: user } = useUser();
    const { mutateAsync: signOut } = useSignOut();
    const username = user?.name ?? 'Guest';
    const fullName = user?.email ?? 'Not signed in';
    const avatarUrl = user?.avatar ?? '';

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="group flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30">
                <Avatar className="size-8">
                    <AvatarImage src={avatarUrl} alt={`${username} profile`} />
                    <AvatarFallback>
                        {username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2">
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="flex items-center gap-2">
                        <Avatar className="size-9">
                            <AvatarImage
                                src={avatarUrl}
                                alt={`${username} profile`}
                            />
                            <AvatarFallback>
                                {username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="">
                            <p className="text-sm font-semibold text-white">
                                {username}
                            </p>
                            <p className="text-xs text-white/60">{fullName}</p>
                        </div>
                    </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem className="cursor-pointer transition-colors hover:bg-white/10 p-2">
                    <Link to="/profile" className="flex w-full items-center">
                        <User className="mr-2 h-4 w-4 text-white/70" />
                        Profile
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem className="text-red-300 focus:text-red-200 cursor-pointer transition-colors hover:bg-white/10 p-2">
                    {user ? (
                        <button
                            type="button"
                            className="flex w-full items-center"
                            onClick={handleSignOut}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign out
                        </button>
                    ) : (
                        <Link to="/login" className="flex w-full items-center">
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign in
                        </Link>
                    )}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
