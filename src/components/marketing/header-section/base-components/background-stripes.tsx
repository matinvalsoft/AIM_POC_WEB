"use client";

import { BackgroundPattern } from "@/components/shared-assets/background-patterns";

export const BackgroundStripes = () => {
    return (
        <div className="absolute inset-0 overflow-hidden">
            <BackgroundPattern
                pattern="grid"
                size="lg"
                className="absolute inset-0 opacity-30"
            />
        </div>
    );
};

