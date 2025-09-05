"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SearchLg, Bell01, HelpCircle, Settings01, Menu01, UploadCloud02 } from "@untitledui/icons";
import { UntitledLogo } from "@/components/foundations/logo/untitledui-logo";
import { NavItemBase } from "@/components/application/app-navigation/base-components/nav-item";
import { NavItemButton } from "@/components/application/app-navigation/base-components/nav-item-button";
import { Button } from "@/components/base/buttons/button";

import { cx } from "@/utils/cx";
import type { DocumentType } from "@/types/documents";
import { Tabs, TabList, Tab } from "@/components/application/tabs/tabs";
import { useInvoiceCounts } from "@/lib/airtable";
import { useFileCounts } from "@/lib/airtable/files-hooks";
import { useEmailCounts } from "@/lib/airtable/emails-hooks";

const firstTierNavItems = [
    { href: "/documents", label: "Documents" },
    { href: "/approvals", label: "Approvals" },
    { href: "/reconciliation", label: "Reconciliation" },
    { href: "/export", label: "Export" },
    { href: "/admin", label: "Admin" },
];

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Get counts from Airtable
    const { counts: invoiceCounts, loading: invoiceCountsLoading } = useInvoiceCounts();
    const { counts: fileCounts, loading: fileCountsLoading } = useFileCounts();
    const { counts: emailCounts, loading: emailCountsLoading } = useEmailCounts();
    
    const documentTypes = [
        { id: 'invoices', label: 'Invoices', badge: invoiceCountsLoading ? '...' : (invoiceCounts.total || 0) },
        { id: 'files', label: 'Files', badge: fileCountsLoading ? '...' : (fileCounts.total || 0) },
        { id: 'emails', label: 'Emails', badge: emailCountsLoading ? '...' : (emailCounts.total || 0) },
        { id: 'pos', label: 'POs', badge: 2 }, // TODO: Implement PO counts when PO integration is added
        { id: 'shipping', label: 'Shipping', badge: 8 },
        { id: 'bank', label: 'Bank', badge: 3 },
    ];
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    // Avoid hydration mismatch by only checking pathname after mount
    useEffect(() => {
        setMounted(true);
    }, []);
    
    const isCurrentPath = (href: string) => {
        if (href === "/documents") {
            return pathname.startsWith("/documents");
        }
        if (href === "/reconciliation") {
            return pathname.startsWith("/reconciliation");
        }
        if (href === "/export") {
            return pathname.startsWith("/export");
        }
        if (href === "/upload") {
            return pathname === "/upload";
        }
        return pathname === href;
    };

    // Check if we're on a documents page to show second-tier navigation
    const isDocumentsPage = pathname.startsWith("/documents");
    const currentDocumentType = (() => {
        if (!isDocumentsPage) return 'invoices';
        const segments = pathname.split('/');
        const type = segments[2] as DocumentType;
        return documentTypes.find(dt => dt.id === type) ? type : 'invoices';
    })();

    const handleDocumentTypeChange = (type: DocumentType) => {
        router.push(`/documents/${type}`);
    };



    return (
        <div className="flex flex-col h-screen bg-primary">
            {/* Global Header */}
            <header className="border-b border-secondary bg-primary sticky top-0 z-50">
                <section className="flex h-16 w-full items-center justify-between px-4 md:h-18 md:px-6">
                    {/* Left side - Logo and Navigation */}
                    <div className="flex flex-1 items-center gap-6">
                        <a
                            aria-label="Go to homepage"
                            href="/"
                            className="rounded-xs outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            <UntitledLogo className="h-12" />
                        </a>

                        {/* First-tier Navigation - Desktop */}
                        <nav className="hidden lg:block">
                            <ul className="flex items-center gap-1">
                                {firstTierNavItems.map((item) => (
                                    <li key={item.href}>
                                        <NavItemBase 
                                            href={item.href} 
                                            current={isCurrentPath(item.href)} 
                                            type="link"
                                        >
                                            {item.label}
                                        </NavItemBase>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </div>

                    {/* Right side - Utilities */}
                    <div className="flex items-center gap-3">

                        
                        {/* Utility Buttons */}
                        <div className="flex items-center gap-1">
                            <NavItemButton 
                                size="md" 
                                icon={SearchLg} 
                                label="Search (⌘K)" 
                                href="#" 
                                tooltipPlacement="bottom" 
                            />
                            <NavItemButton 
                                size="md" 
                                icon={UploadCloud02} 
                                label="Upload Files" 
                                href="/upload" 
                                current={mounted && isCurrentPath("/upload")}
                                tooltipPlacement="bottom" 
                            />
                            <NavItemButton 
                                size="md" 
                                icon={Bell01} 
                                label="Notifications" 
                                href="#" 
                                tooltipPlacement="bottom" 
                            />
                            <NavItemButton 
                                size="md" 
                                icon={HelpCircle} 
                                label="Help" 
                                href="#" 
                                tooltipPlacement="bottom" 
                            />
                            <NavItemButton 
                                size="md" 
                                icon={Settings01} 
                                label="Settings" 
                                href="#" 
                                tooltipPlacement="bottom" 
                            />
                        </div>

                        {/* Mobile Menu Toggle */}
                        <NavItemButton 
                            size="md" 
                            icon={Menu01} 
                            label="Menu" 
                            href="#" 
                            tooltipPlacement="bottom"
                            className="lg:hidden"
                            onClick={(e) => {
                                e.preventDefault();
                                setIsMobileMenuOpen(!isMobileMenuOpen);
                            }}
                        />
                    </div>
                </section>

                {/* Mobile Navigation Menu */}
                {isMobileMenuOpen && (
                    <div className="border-t border-secondary bg-primary lg:hidden">
                        <nav className="px-4 py-3">
                            <ul className="space-y-1">
                                {firstTierNavItems.map((item) => (
                                    <li key={item.href}>
                                        <NavItemBase 
                                            href={item.href} 
                                            current={isCurrentPath(item.href)} 
                                            type="link"
                                        >
                                            {item.label}
                                        </NavItemBase>
                                    </li>
                                ))}
                            </ul>

                        </nav>
                    </div>
                )}
            </header>

            {/* Second-tier Navigation - Only for Documents pages */}
            {isDocumentsPage && (
                <div className="sticky top-16 md:top-18 z-40 border-b border-secondary bg-primary px-6 pt-4 flex-shrink-0">
                    <Tabs 
                        selectedKey={currentDocumentType}
                        onSelectionChange={(key) => handleDocumentTypeChange(key as DocumentType)}
                    >
                        <TabList 
                            items={documentTypes}
                            type="underline"
                            size="md"
                            className="scrollable-on-mobile"
                        >
                            {(item) => (
                                <Tab 
                                    key={item.id}
                                    id={item.id}
                                    label={item.label}
                                    badge={item.badge}
                                />
                            )}
                        </TabList>
                    </Tabs>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 min-h-0">
                {children}
            </main>


        </div>
    );
}
