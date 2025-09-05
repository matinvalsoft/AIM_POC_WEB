"use client";

import type { SVGProps } from "react";
import { cx } from "@/utils/cx";

export const AutoLedgerLogoMinimal = (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    return (
        <img 
            src="https://d1dyndsnc54cq8.cloudfront.net/assets/sns-large-logo.png"
            alt="AutoLedger"
            {...props}
            className={cx("size-12 object-contain", props.className)}
        />
    );
};

// Backward compatibility alias
export const UntitledLogoMinimal = AutoLedgerLogoMinimal;
