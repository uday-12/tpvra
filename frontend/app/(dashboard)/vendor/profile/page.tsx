"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/auth-client";

export default function VendorProfilePage() {
    const { data: session } = useSession();

    const [firstName, setFirstName] = useState(
        session?.user?.name?.split(" ")[0] || ""
    );
    const [lastName, setLastName] = useState(
        session?.user?.name?.split(" ")[1] || ""
    );
    const [email, setEmail] = useState(
        session?.user?.email || ""
    );

    const getInitials = (first: string, last: string) => {
        return `${first[0] || ""}${last[0] || ""}`.toUpperCase();
    };

    const handleSaveChanges = () => {
        console.log("Saving profile changes:", {
            firstName,
            lastName,
            email,
        });
    };

    const handleUploadPhoto = () => {
        console.log("Upload photo clicked");
    };

    return (
        <div className="flex flex-col gap-6 p-8">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
            </div>

            <div className="rounded-lg border bg-card p-6">
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-semibold text-xl">
                            {getInitials(firstName, lastName)}
                        </div>
                        <div>
                            <button
                                onClick={handleUploadPhoto}
                                className="flex items-center gap-2 text-orange-500 hover:text-orange-600 font-medium"
                            >
                                <Upload className="h-4 w-4" />
                                Upload Photo
                            </button>
                            <p className="text-sm text-slate-500 mt-1">
                                JPG, PNG or GIF. Max 2MB.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="first-name">First Name</Label>
                        <Input
                            id="first-name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="focus-visible:ring-orange-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="last-name">Last Name</Label>
                        <Input
                            id="last-name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="focus-visible:ring-orange-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="focus-visible:ring-orange-500"
                        />
                    </div>

                    <div className="pt-4">
                        <Button
                            onClick={handleSaveChanges}
                            className="bg-orange-500 hover:bg-orange-600"
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
