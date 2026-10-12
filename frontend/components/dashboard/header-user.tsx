"use client";

import { ChevronDown, LogOut, User } from "lucide-react";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession, signOut } from "@/lib/auth-client";

export function HeaderUser() {
    const { data: session } = useSession();

    const userName = session?.user?.name || "User";
    const userEmail = session?.user?.email || "user@example.com";
    const userRole = session?.user?.role || "admin";

    // Get initials from name
    const getInitials = (name: string) => {
        const parts = name.split(" ");
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    const handleLogout = () => {
        signOut({
            fetchOptions: {
                onSuccess: () => {
                    window.location.href = "/login";
                },
            },
        });
    };

    return (
        <div className="flex items-center gap-4">
            {/* User Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-3 outline-none">
                    <div className="h-9 w-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-semibold text-sm">
                        {getInitials(userName)}
                    </div>
                    <div className="flex flex-col items-start text-left">
                        <span className="text-sm font-semibold text-slate-900">
                            {userName}
                        </span>
                        <span className="text-xs text-slate-500">{userEmail}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href={`/${userRole}/profile`}>
                            <User className="h-4 w-4 mr-2" />
                            Profile
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={handleLogout}
                        className="text-red-600 cursor-pointer"
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
