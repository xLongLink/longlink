import { Building2, LogOut, Smile, User, Users } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type UserProfileProps = {
    username?: string;
    fullName?: string;
    avatarUrl?: string;
};

const defaultUser = {
    username: 'Sau1707',
    fullName: 'Leonardo Saurwein',
    avatarUrl:
        'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=facearea&w=80&h=80&q=80',
};

export function UserProfile({
    username = defaultUser.username,
    fullName = defaultUser.fullName,
    avatarUrl = defaultUser.avatarUrl,
}: UserProfileProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30">
                <Avatar className="size-7">
                    <AvatarImage src={avatarUrl} alt={`${username} profile`} />
                    <AvatarFallback>
                        {username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-white/80">
                    {username}
                </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="space-y-1">
                    <p className="text-sm font-semibold text-white">
                        {username}
                    </p>
                    <p className="text-xs text-white/60">{fullName}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                    <Smile className="mr-2 h-4 w-4 text-white/70" />
                    Set status
                </DropdownMenuItem>
                <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4 text-white/70" />
                    Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                    <Building2 className="mr-2 h-4 w-4 text-white/70" />
                    Organizations
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                    <Users className="mr-2 h-4 w-4 text-white/70" />
                    Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-300 focus:text-red-200">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
