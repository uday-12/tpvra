"use client"

import { useState } from "react"
import { Mail, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AdminSettingsPage() {
    // Profile form state
    const [firstName, setFirstName] = useState("Admin")
    const [lastName, setLastName] = useState("User")
    const [email, setEmail] = useState("testflair.admin@gmail.com")
    const [phone, setPhone] = useState("+1 234 567 8900")
    const [organization, setOrganization] = useState("TPVRA")
    const role = "Administrator"

    const handleSaveChanges = () => {
        // TODO: Implement actual API call
        console.log("Saving profile changes:", {
            firstName,
            lastName,
            email,
            phone,
            organization,
            role,
        })
    }

    return (
        <div className="flex flex-col gap-6 p-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                <Button
                    variant="default"
                    className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90"
                >
                    Profile
                </Button>
            </div>

            {/* Profile Section */}
            <div className="rounded-lg border bg-card p-6">
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold">Profile Information</h2>

                        {/* First Name and Last Name */}
                        <div className="grid grid-cols-2 gap-6">
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
                        </div>

                        {/* Email and Phone */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="focus-visible:ring-orange-500 pr-10"
                                    />
                                    <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="focus-visible:ring-orange-500"
                                />
                            </div>
                        </div>

                        {/* Organization and Role */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="organization">Organization</Label>
                                <Input
                                    id="organization"
                                    value={organization}
                                    onChange={(e) => setOrganization(e.target.value)}
                                    className="focus-visible:ring-orange-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <Input
                                    id="role"
                                    value={role}
                                    disabled
                                    className="bg-muted text-muted-foreground cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end pt-4">
                            <Button
                                onClick={handleSaveChanges}
                                className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </div>
        </div>
    )
}
