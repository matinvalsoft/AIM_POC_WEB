"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { cx } from "@/utils/cx";
import type { IconComponentType } from "@/components/base/badges/badge-types";

interface PricingTierCardIconProps {
    title: string;
    subtitle: string;
    description: string;
    badge?: string;
    features: string[];
    icon: IconComponentType;
    iconTheme?: "light" | "gradient" | "dark";
    iconColor?: "brand" | "gray" | "error" | "warning" | "success";
    buttonText?: string;
    isPopular?: boolean;
    className?: string;
}

export const PricingTierCardIcon = ({
    title,
    subtitle,
    description,
    badge,
    features,
    icon,
    iconTheme = "light",
    iconColor = "brand",
    buttonText = "Get started",
    isPopular = false,
    className,
}: PricingTierCardIconProps) => {
    return (
        <div
            className={cx(
                "relative rounded-2xl border bg-primary p-6 md:p-8",
                isPopular || badge
                    ? "border-brand-primary ring-4 ring-brand-primary/10"
                    : "border-secondary",
                className
            )}
        >
            {badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge type="pill-color" color="brand" size="sm">
                        {badge}
                    </Badge>
                </div>
            )}

            <div className="space-y-6">
                {/* Icon */}
                <div className="flex justify-center md:justify-start">
                    <FeaturedIcon
                        icon={icon}
                        theme={iconTheme}
                        color={iconColor}
                        size="lg"
                    />
                </div>

                {/* Header */}
                <div className="space-y-2 text-center md:text-left">
                    <h3 className="text-lg font-semibold text-primary md:text-xl">
                        {title}
                    </h3>
                    <div>
                        <div className="text-2xl font-bold text-primary md:text-3xl">
                            {subtitle}
                        </div>
                        <p className="text-sm text-tertiary">{description}</p>
                    </div>
                </div>

                {/* Features */}
                <ul className="space-y-3">
                    {features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                            <div className="mt-1 flex h-5 w-5 items-center justify-center">
                                <svg
                                    className="h-4 w-4 text-success-solid"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>
                            <span className="text-sm text-secondary">{feature}</span>
                        </li>
                    ))}
                </ul>

                {/* CTA Button */}
                <div className="pt-2">
                    <Button
                        size="md"
                        variant={isPopular || badge ? "primary" : "secondary"}
                        className="w-full"
                    >
                        {buttonText}
                    </Button>
                </div>
            </div>
        </div>
    );
};

