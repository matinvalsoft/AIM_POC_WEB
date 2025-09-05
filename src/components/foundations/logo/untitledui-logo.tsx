"use client";

import type { HTMLAttributes } from "react";
import { cx } from "@/utils/cx";

export const AutoLedgerLogo = (props: HTMLAttributes<HTMLOrSVGElement>) => {
    return (
        <div {...props} className={cx("flex h-8 w-max items-center justify-start overflow-visible", props.className)}>
            {/* AutoLedger logo */}
            <img 
                src="https://d1dyndsnc54cq8.cloudfront.net/assets/sns-large-logo.png" 
                alt="AutoLedger"
                className="h-full w-auto object-contain"
            />
        </div>
    );
};

// Backward compatibility alias
export const UntitledLogo = AutoLedgerLogo;
