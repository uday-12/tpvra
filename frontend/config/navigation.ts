import {
    LayoutDashboard,
    Users,
    Settings,
    Building2,
    Link,
    ShieldCheck,
    FileText,
    CreditCard,
    FileSearch
} from "lucide-react";

export type SidebarItem = {
    title: string;
    url: string;
    icon?: React.ElementType;
    isActive?: boolean;
    items?: {
        title: string;
        url: string;
    }[];
};

export const SIDEBAR_CONFIG: Record<string, SidebarItem[]> = {
    admin: [
        {
            title: "Dashboard",
            url: "/admin/dashboard",
            icon: LayoutDashboard,
        },
        {
            title: "Assessors",
            url: "/admin/assessors",
            icon: Users,
        },
        {
            title: "Vendors",
            url: "/admin/vendors",
            icon: Building2,
        },
        {
            title: "Assessments",
            url: "/admin/assessments",
            icon: FileText,
        },
        // {
        //     title: "Admins",
        //     url: "/admin/admins",
        //     icon: ShieldCheck,
        // },
        {
            title: "Payments",
            url: "/admin/payments",
            icon: CreditCard,
        },
        // {
        //     title: "Audit Logs",
        //     url: "/admin/logs",
        //     icon: FileSearch,
        // },
        // {
        //     title: "Settings",
        //     url: "/admin/settings",
        //     icon: Settings,
        // },
    ],
    vendor: [
        {
            title: "Dashboard",
            url: "/vendor/dashboard",
            icon: LayoutDashboard,
        },
        {
            title: "Assessments",
            url: "/vendor/assessments",
            icon: FileText,
        },
        {
            title: "Clarifications",
            url: "/vendor/clarifications",
            icon: FileSearch,
        },
        {
            title: "Payments",
            url: "/vendor/payments",
            icon: CreditCard,
        },
    ],
    assessor: [
        {
            title: "Dashboard",
            url: "/assessor/dashboard",
            icon: LayoutDashboard,
        },
        {
            title: "Assessments",
            url: "/assessor/assessments",
            icon: FileText,
        },
        {
            title: "Clarifications",
            url: "/assessor/clarifications",
            icon: FileSearch,
        },
    ],
};

export const DEFAULT_SIDEBAR_ITEMS: SidebarItem[] = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
    },
];
