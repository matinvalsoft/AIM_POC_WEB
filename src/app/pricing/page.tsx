
"use client";

import { type FC, Fragment } from "react";
import { CheckCircle, HelpCircle, LayersThree01, LayersTwo01, Minus, Zap } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { cx } from "@/utils/cx";

type Tier = {
    name: string;
    canChatToSales?: boolean;
    highlighted?: boolean;
    badge?: string;
    href?: string;
    priceMonthly: number | string;
    description: string;
    icon?: FC;
};

const tiers: Tier[] = [
    {
        name: "Basic",
        href: "#",
        priceMonthly: 50,
        description: "Perfect for small businesses and freelancers.",
        icon: Zap,
    },
    {
        name: "Advanced",
        highlighted: true,
        href: "#",
        priceMonthly: 800,
        description: "For mid-market businesses with high volume.",
        icon: LayersTwo01,
    },
    {
        name: "Enterprise",
        href: "#",
        priceMonthly: "Custom",
        description: "Tailored solutions for large organizations.",
        icon: LayersThree01,
        canChatToSales: true,
    },
];

type Section = { name: string; features: { name: string; tooltip: { title: string; description: string }; tiers: Record<string, boolean | string> }[] };

const sections2: Section[] = [
    {
        name: "Overview",
        features: [
            {
                name: "Document processing",
                tooltip: {
                    title: "Monthly document processing limit",
                    description: "Number of documents you can process each month with your plan.",
                },
                tiers: {
                    Basic: "50 invoices",
                    Advanced: "500 invoices/PO/other", 
                    Enterprise: "Unlimited",
                },
            },
            {
                name: "AP Bookkeeping",
                tooltip: {
                    title: "Accounts Payable management",
                    description: "Complete accounts payable bookkeeping and management features.",
                },
                tiers: {
                    Basic: true,
                    Advanced: true,
                    Enterprise: true,
                },
            },
            {
                name: "Bank reconciliation",
                tooltip: {
                    title: "Automated bank reconciliation",
                    description: "Match transactions automatically and streamline your reconciliation process.",
                },
                tiers: {
                    Basic: "Basic",
                    Advanced: "Advanced",
                    Enterprise: "Advanced",
                },
            },
            {
                name: "GL coding",
                tooltip: {
                    title: "General Ledger coding",
                    description: "Automated and manual general ledger account coding for all transactions.",
                },
                tiers: {
                    Basic: true,
                    Advanced: true,
                    Enterprise: true,
                },
            },
            {
                name: "Support",
                tooltip: {
                    title: "Customer support access",
                    description: "Access to customer support and training resources.",
                },
                tiers: {
                    Basic: "Email support",
                    Advanced: "Priority support",
                    Enterprise: "Dedicated account manager",
                },
            },
        ],
    },
    {
        name: "Document Processing",
        features: [
            {
                name: "Email ingest & manual upload",
                tooltip: {
                    title: "Document ingestion methods",
                    description: "Upload documents via email forwarding or manual file upload.",
                },
                tiers: {
                    Basic: true,
                    Advanced: true,
                    Enterprise: true,
                },
            },
            {
                name: "SFTP upload",
                tooltip: {
                    title: "Secure file transfer",
                    description: "Upload documents securely via SFTP for automated processing.",
                },
                tiers: {
                    Enterprise: true,
                },
            },
            {
                name: "Shipping & receiving documents",
                tooltip: {
                    title: "Logistics document processing",
                    description: "Process shipping receipts, delivery confirmations, and receiving documents.",
                },
                tiers: {
                    Advanced: true,
                    Enterprise: true,
                },
            },
            {
                name: "Purchase orders",
                tooltip: {
                    title: "Purchase order management",
                    description: "Create, track, and manage purchase orders within the system.",
                },
                tiers: {
                    Advanced: true,
                    Enterprise: true,
                },
            },
            {
                name: "3-way matching",
                tooltip: {
                    title: "Three-way document matching",
                    description: "Automatically match purchase orders, invoices, and receipts for accuracy.",
                },
                tiers: {
                    Advanced: true,
                    Enterprise: true,
                },
            },
        ],
    },
    {
        name: "Integrations & Workflows",
        features: [
            {
                name: "QuickBooks & Xero integration",
                tooltip: {
                    title: "Popular accounting software",
                    description: "Direct integration with QuickBooks and Xero accounting platforms.",
                },
                tiers: {
                    Basic: true,
                    Advanced: true,
                    Enterprise: true,
                },
            },
            {
                name: "Oracle, AS/400, Sage integrations",
                tooltip: {
                    title: "Enterprise accounting systems",
                    description: "Integration with enterprise-grade accounting and ERP systems.",
                },
                tiers: {
                    Advanced: true,
                    Enterprise: true,
                },
            },
            {
                name: "Approval workflows",
                tooltip: {
                    title: "Custom approval processes",
                    description: "Set up multi-step approval workflows for invoices and expenses.",
                },
                tiers: {
                    Advanced: true,
                    Enterprise: true,
                },
            },
            {
                name: "Custom integrations",
                tooltip: {
                    title: "Tailored system connections",
                    description: "Custom-built integrations with your existing business systems.",
                },
                tiers: {
                    Enterprise: true,
                },
            },
        ],
    },
    {
        name: "Enterprise Features",
        features: [
            {
                name: "Custom objects & fields",
                tooltip: {
                    title: "Flexible data structure",
                    description: "Create custom data fields and objects to match your business processes.",
                },
                tiers: {
                    Enterprise: true,
                },
            },
            {
                name: "Custom coding workflows",
                tooltip: {
                    title: "Tailored coding processes",
                    description: "Design custom workflows for GL coding that match your specific requirements.",
                },
                tiers: {
                    Enterprise: true,
                },
            },
            {
                name: "Advanced security & compliance",
                tooltip: {
                    title: "Enterprise-grade security",
                    description: "Advanced security features and compliance tools for enterprise requirements.",
                },
                tiers: {
                    Enterprise: true,
                },
            },
            {
                name: "Priority support & training",
                tooltip: {
                    title: "Premium support experience",
                    description: "Priority support with dedicated training and onboarding assistance.",
                },
                tiers: {
                    Enterprise: true,
                },
            },
        ],
    },
];

export default function PricingPage() {
    return (
        <section className="overflow-hidden bg-primary">
            <div className="mx-auto max-w-container px-4 py-16 md:px-8 md:py-24">
                <div className="flex w-full max-w-3xl flex-col">
                    <span className="text-sm font-semibold text-brand-secondary md:text-md">Pricing</span>
                </div>
            </div>

            <div className="w-full py-16 md:px-8 md:py-24 lg:mx-auto lg:max-w-container">
                {/* xs to lg */}
                <div className="space-y-16 lg:hidden">
                    {tiers.map((tier) => (
                        <section key={tier.name}>
                            <div className="mb-8 flex flex-col px-4">
                                <FeaturedIcon icon={tier.icon} color="gray" theme="modern" size="md" />
                                <p key={tier.name} className="mt-5 flex items-center gap-2 text-xl font-semibold text-brand-secondary">
                                    {tier.name} plan
                                    {tier.badge && (
                                        <Badge size="md" type="pill-color" color="brand">
                                            {tier.badge}
                                        </Badge>
                                    )}
                                </p>
                                <p className="mt-2 text-display-md font-semibold text-primary">
                                    {typeof tier.priceMonthly === 'number' ? `$${tier.priceMonthly}/mth` : tier.priceMonthly}
                                </p>
                                <p className="mt-2 text-md text-tertiary">{tier.description}</p>
                                <div className="mt-8 flex flex-col gap-3">
                                    <Button size="xl">{tier.name === "Enterprise" ? "Contact us" : "Free trial"}</Button>
                                </div>
                            </div>

                            {sections2.map((section, index) => (
                                <table key={section.name} className="mb-8 w-full last:mb-0">
                                    <caption className={cx("px-4 pb-4 text-left text-sm font-semibold text-brand-secondary", index === 0 && "sr-only")}>
                                        {section.name}
                                    </caption>
                                    <thead>
                                        <tr>
                                            <th className="sr-only" scope="col">
                                                Feature
                                            </th>
                                            <th className="sr-only" scope="col">
                                                Included
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {section.features.map((feature, index) => (
                                            <tr key={feature.name} className={cx(index % 2 === 0 && "bg-secondary_alt")}>
                                                <th className="flex py-4.5 pl-4 text-left text-sm font-medium text-primary" scope="row">
                                                    {feature.name}
                                                </th>
                                                <td className="py-4.5 pr-4">
                                                    <div className="flex items-center justify-end text-right">
                                                        {typeof feature.tiers[tier.name] === "string" ? (
                                                            <span className="block text-sm text-tertiary">{feature.tiers[tier.name]}</span>
                                                        ) : (
                                                            <>
                                                                {feature.tiers[tier.name] === true ? (
                                                                    <CheckCircle className="-my-1 size-6 text-fg-success-primary" />
                                                                ) : (
                                                                    <Minus className="ml-auto size-5 text-fg-disabled" aria-hidden="true" />
                                                                )}

                                                                <span className="sr-only">{feature.tiers[tier.name] === true ? "Yes" : "No"}</span>
                                                            </>
                                                        )}{" "}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ))}

                        </section>
                    ))}
                </div>

                {/* lg+ */}
                <div className="max-lg:hidden">
                    <table className="h-px w-full table-fixed">
                        <caption className="sr-only">Pricing plan comparison</caption>
                        <thead>
                            <tr>
                                <th scope="col">
                                    <span className="sr-only">Feature by plans</span>
                                </th>
                                {tiers.map((tier) => (
                                    <th key={tier.name} className={cx("relative w-1/4 px-6 pt-6 pb-2")} scope="col">
                                        {tier.highlighted && (
                                            <div className="pointer-events-none absolute -inset-x-px inset-y-0 rounded-t-2xl border-x-2 border-t-2 border-brand"></div>
                                        )}
                                        <div className="flex flex-col items-center gap-5 text-center">
                                            <FeaturedIcon icon={tier.icon} color="gray" theme="modern" size="md" />
                                            <p className="inline-flex items-center gap-2 text-xl font-semibold text-brand-secondary">
                                                {tier.name} plan
                                                {tier.badge && (
                                                    <Badge size="md" type="pill-color" color="brand">
                                                        {tier.badge}
                                                    </Badge>
                                                )}
                                            </p>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <th scope="row"></th>
                                {tiers.map((tier) => (
                                    <td key={tier.name} className={cx("h-full px-6 pb-8 align-top md:pb-10", tier.highlighted && "border-x-2 border-brand")}>
                                        <div className="flex h-full flex-col items-center justify-between text-center">
                                            <div className="flex flex-col">
                                                <p className="text-display-lg font-semibold text-primary">
                                                    {typeof tier.priceMonthly === 'number' ? `$${tier.priceMonthly}/mth` : tier.priceMonthly}
                                                </p>
                                                <p className="mt-2 text-md text-tertiary">{tier.description}</p>
                                            </div>
                                            <div className="mt-8 flex w-full flex-col gap-3">
                                                <Button size="xl">{tier.name === "Enterprise" ? "Contact us" : "Free trial"}</Button>
                                            </div>
                                        </div>
                                    </td>
                                ))}
                            </tr>
                            {sections2.map((section, index) => (
                                <Fragment key={section.name}>
                                    <tr className={cx(index === 0 && "sr-only")}>
                                        <th
                                            scope="colgroup"
                                            className={cx(index > 0 ? "pt-10" : "pt-0", "px-6 pb-4 text-left text-sm font-semibold text-brand-secondary")}
                                        >
                                            {section.name}
                                        </th>
                                        {tiers.map((tier) => (
                                            <td key={tier.name} className={cx("px-6 pb-4", tier.highlighted && "border-x-2 border-brand")}></td>
                                        ))}
                                    </tr>
                                    {section.features.map((feature, index) => (
                                        <tr key={feature.name} className={cx(index % 2 === 0 && "bg-secondary_alt")}>
                                            <th className="px-6 py-5.5 text-left text-sm font-medium text-primary" scope="row">
                                                {feature.name}
                                                <Tooltip title={feature.tooltip.title} description={feature.tooltip.description} delay={0} closeDelay={0}>
                                                    <TooltipTrigger className="cursor-pointer text-fg-quaternary transition duration-100 hover:text-fg-quaternary_hover focus:text-fg-quaternary_hover">
                                                        <HelpCircle className="ml-1 inline-block size-4" />
                                                    </TooltipTrigger>
                                                </Tooltip>
                                            </th>
                                            {tiers.map((tier) => (
                                                <td key={tier.name} className={cx("px-6 py-5", tier.highlighted && "border-x-2 border-brand")}>
                                                    <div className="flex items-center justify-center text-center">
                                                        {typeof feature.tiers[tier.name] === "string" ? (
                                                            <span className="block text-sm text-tertiary">{feature.tiers[tier.name]}</span>
                                                        ) : (
                                                            <>
                                                                {feature.tiers[tier.name] === true ? (
                                                                    <CheckCircle className="size-6 text-fg-success-primary" />
                                                                ) : (
                                                                    <Minus className="mx-auto size-5 text-fg-disabled" aria-hidden="true" />
                                                                )}

                                                                <span className="sr-only">
                                                                    {feature.tiers[tier.name] === true ? "Included" : "Not included"} in {tier.name}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </Fragment>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <th className="sr-only" scope="row">
                                    Choose your plan
                                </th>
                                {tiers.map((tier) => (
                                    <td key={tier.name} className="relative px-6 py-8">
                                        {tier.highlighted && (
                                            <div className="pointer-events-none absolute -inset-x-px inset-y-0 rounded-b-2xl border-x-2 border-b-2 border-brand"></div>
                                        )}
                                        <div className="flex flex-col gap-3">
                                            <Button size="xl">{tier.name === "Enterprise" ? "Contact us" : "Free trial"}</Button>
                                            
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </section>
    );
}
