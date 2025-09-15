"use client";

import { usePathname, useRouter } from "next/navigation";
import { UploadCloud02, HelpCircle } from "@untitledui/icons";
import { NavItemButton } from "@/components/application/app-navigation/base-components/nav-item-button";

import { cx } from "@/utils/cx";
import type { DocumentType } from "@/types/documents";
import { useInvoiceCounts } from "@/lib/airtable";
import { useFileCounts } from "@/lib/airtable/files-hooks";


export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Get counts from Airtable
    const { counts: invoiceCounts, loading: invoiceCountsLoading } = useInvoiceCounts();
    const { counts: fileCounts, loading: fileCountsLoading } = useFileCounts();
    
    const documentTypes = [
        { id: 'invoices', label: 'Invoices', badge: invoiceCountsLoading ? '...' : (invoiceCounts.total || 0) },
        { id: 'store-receivers', label: 'Store Receivers', badge: 5 }, // TODO: Implement counts when store receivers integration is added
        { id: 'delivery-tickets', label: 'Delivery Tickets', badge: 12 }, // TODO: Implement counts when delivery tickets integration is added
        { id: 'files', label: 'Files', badge: fileCountsLoading ? '...' : (fileCounts.total || 0) },
    ];
    const pathname = usePathname();
    const router = useRouter();
    
    const isCurrentPath = (href: string) => {
        if (href === "/upload") {
            return pathname === "/upload";
        }
        return pathname === href;
    };

    // Determine current document type from pathname
    const currentDocumentType = (() => {
        const segments = pathname.split('/');
        // Check if we're on a direct document type page (e.g., /invoices, /emails)
        const potentialType = segments[1] as DocumentType;
        return documentTypes.find(dt => dt.id === potentialType) ? potentialType : 'invoices';
    })();

    const handleDocumentTypeChange = (type: DocumentType) => {
        router.push(`/${type}`);
    };



    return (
        <div className="flex flex-col h-screen bg-primary">

            {/* Document Type Navigation */}
            <div className="sticky top-0 z-50 border-b border-secondary bg-primary px-6 flex-shrink-0">
                    <div className="flex items-center justify-between relative">
                        <div className="flex items-center gap-6">
                            {/* Primary Document Types */}
                            <div className="flex items-center gap-3">
                                {documentTypes.slice(0, 3).map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleDocumentTypeChange(item.id as DocumentType)}
                                        className={cx(
                                            "flex items-center gap-2 text-md font-semibold px-1 pt-4 pb-3 rounded-none border-b-2 border-transparent transition duration-100 ease-linear",
                                            currentDocumentType === item.id 
                                                ? "border-fg-brand-primary_alt text-brand-secondary" 
                                                : "text-quaternary hover:border-fg-brand-primary_alt hover:text-brand-secondary"
                                        )}
                                    >
                                        {item.label}
                                        {item.badge && (
                                            <span className="hidden md:flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                                                {item.badge}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                            
                            {/* Divider */}
                            <div className="h-6 w-px bg-border-secondary"></div>
                            
                            {/* Communication Types */}
                            <div className="flex items-center gap-3">
                                {documentTypes.slice(3).map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleDocumentTypeChange(item.id as DocumentType)}
                                        className={cx(
                                            "flex items-center gap-2 text-md font-semibold px-1 pt-4 pb-3 rounded-none border-b-2 border-transparent transition duration-100 ease-linear",
                                            currentDocumentType === item.id 
                                                ? "border-fg-brand-primary_alt text-brand-secondary" 
                                                : "text-quaternary hover:border-fg-brand-primary_alt hover:text-brand-secondary"
                                        )}
                                    >
                                        {item.label}
                                        {item.badge && (
                                            <span className="hidden md:flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                                                {item.badge}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1">
                            <NavItemButton 
                                size="md" 
                                icon={UploadCloud02} 
                                label="Upload Files" 
                                href="/upload" 
                                current={isCurrentPath("/upload")}
                                tooltipPlacement="bottom" 
                            />
                            <NavItemButton 
                                size="md" 
                                icon={HelpCircle} 
                                label="Help" 
                                href="#" 
                                tooltipPlacement="bottom" 
                            />
                        </div>
                    </div>
                </div>

            {/* Main Content Area */}
            <main className="flex-1 min-h-0">
                {children}
            </main>


        </div>
    );
}
