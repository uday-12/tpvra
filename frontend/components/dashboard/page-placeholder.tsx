import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Construction } from "lucide-react";

export function PagePlaceholder({ title, description }: { title: string, description?: string }) {
    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Empty className="w-full max-w-2xl border-2 border-dashed">
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <Construction className="h-6 w-6" />
                    </EmptyMedia>
                    <EmptyTitle className="text-2xl">{title}</EmptyTitle>
                    <EmptyDescription className="text-base text-slate-500">
                        {description || "This feature is currently under development. We're working hard to bring it to you soon!"}
                    </EmptyDescription>
                </EmptyHeader>
            </Empty>
        </div>
    );
}
