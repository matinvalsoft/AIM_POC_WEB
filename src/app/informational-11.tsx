"use client";

import { Fragment, useState } from "react";
import { Edit05, PhoneCall01, SearchLg, Menu01 } from "@untitledui/icons";
import { ListBox, ListBoxItem, type ListBoxItemProps } from "react-aria-components";
import { NavItemButton } from "@/components/application/app-navigation/base-components/nav-item-button";
import { HeaderNavigationBase } from "@/components/application/app-navigation/header-navigation";
import { UntitledLogo } from "@/components/foundations/logo/untitledui-logo";
import { NavItemBase } from "@/components/application/app-navigation/base-components/nav-item";
import { ContentDivider } from "@/components/application/content-divider/content-divider";
import { MessageActionTextarea } from "@/components/application/messaging/message-action.demo";
import type { Message } from "@/components/application/messaging/messaging";
import { MessageItem } from "@/components/application/messaging/messaging";
import { TableRowActionsDropdown } from "@/components/application/table/table";
import { Avatar } from "@/components/base/avatar/avatar";
import { AvatarLabelGroup } from "@/components/base/avatar/avatar-label-group";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Dot } from "@/components/foundations/dot-icon";
import { cx } from "@/utils/cx";

// Helper function for formatting relative time
const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diffInMinutes = Math.floor((now - timestamp) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
        return "Just now";
    } else if (diffInMinutes < 60) {
        return `${diffInMinutes} mins ago`;
    } else if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
    } else if (diffInDays === 1) {
        // Yesterday - show time
        const date = new Date(timestamp);
        const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

        return `Yesterday ${time.toLowerCase()}`;
    } else if (diffInDays <= 7) {
        // Within a week - show day and time
        const date = new Date(timestamp);
        const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" });
        const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

        return `${dayOfWeek} ${time.toLowerCase()}`;
    } else {
        return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
    }
};

type InvoiceProps = {
    id: string;
    processed: boolean;
    isCurrent?: boolean;
    vendorName: string;
    vendorCode: string;
    amount: number;
    // currency removed
    dueDate: Date;
    status: "pending" | "approved" | "rejected" | "paid";
    invoiceNumber: string;
};

const invoices: InvoiceProps[] = [
    {
        id: "inv-001",
        processed: false,
        isCurrent: true,
        vendorName: "Acme Corporation",
        vendorCode: "ACME001",
        amount: 2500.00,
        
        dueDate: new Date(2024, 2, 15),
        status: "pending",
        invoiceNumber: "INV-2024-001",
    },
    {
        id: "inv-002",
        processed: true,
        vendorName: "Tech Solutions Ltd",
        vendorCode: "TECH002",
        amount: 1750.50,
        
        dueDate: new Date(2024, 2, 20),
        status: "approved",
        invoiceNumber: "INV-2024-002",
    },
    {
        id: "inv-003",
        processed: false,
        vendorName: "Office Supplies Co",
        vendorCode: "OFF003",
        amount: 489.99,
        
        dueDate: new Date(2024, 2, 10),
        status: "pending",
        invoiceNumber: "INV-2024-003",
    },
    {
        id: "inv-004",
        processed: true,
        vendorName: "Consulting Group",
        vendorCode: "CONS004",
        amount: 5000.00,
        
        dueDate: new Date(2024, 1, 28),
        status: "paid",
        invoiceNumber: "INV-2024-004",
    },
    {
        id: "inv-005",
        processed: false,
        vendorName: "Marketing Agency",
        vendorCode: "MARK005",
        amount: 3200.00,
        
        dueDate: new Date(2024, 2, 25),
        status: "rejected",
        invoiceNumber: "INV-2024-005",
    },
];

const messageGroups: Array<Array<Omit<Message, "sentAt"> & { sentAt: number }>> = [
    [
        {
            id: "msg-0",
            sentAt: new Date(2025, 6, 31, 11, 39).getTime(),
            user: {
                name: "Andi Lane",
                avatarUrl: "https://www.untitledui.com/images/avatars/andi-lane?fm=webp&q=80",
                status: "online",
            },
            text: "Thanks Olivia! Almost there. I'll work on making those changes you suggested and will shoot it over.",
        },
        {
            id: "msg-1",
            sentAt: new Date(2025, 6, 31, 11, 40).getTime(),
            user: {
                name: "Andi Lane",
                avatarUrl: "https://www.untitledui.com/images/avatars/andi-lane?fm=webp&q=80",
                status: "online",
            },
            text: "Hey Olivia, I've finished with the requirements doc! I made some notes in the gdoc as well for Phoenix to look over.",
        },
        {
            id: "msg-1.2",
            sentAt: new Date(2025, 6, 31, 11, 40).getTime(),
            user: {
                name: "Andi Lane",
                avatarUrl: "https://www.untitledui.com/images/avatars/andi-lane?fm=webp&q=80",
                status: "online",
            },
            attachment: {
                type: "pdf",
                name: "Tech requirements.pdf",
                size: "1.2 MB",
            },
        },
        {
            id: "msg-2",
            sentAt: new Date(2025, 6, 31, 11, 41).getTime(),
            user: {
                me: true,
            },
            text: "Awesome! Thanks. I'll look at this today.",
        },
        {
            id: "msg-3",
            sentAt: new Date(2025, 6, 31, 11, 44).getTime(),
            user: {
                name: "Andi Lane",
                avatarUrl: "https://www.untitledui.com/images/avatars/andi-lane?fm=webp&q=80",
                status: "online",
            },
            text: "No rush though—we still have to wait for Lana's designs.",
        },
    ],
    [
        {
            id: "msg-4",
            sentAt: new Date(2025, 6, 31, 11, 44).getTime(),
            user: {
                name: "Andi Lane",
                avatarUrl: "https://www.untitledui.com/images/avatars/andi-lane?fm=webp&q=80",
                status: "online",
            },
            text: "Hey Olivia, can you please review the latest design when you can?",
        },
        {
            id: "msg-5",
            sentAt: Date.now() - 30 * 1000,
            user: {
                me: true,
            },
            text: "Sure thing, I'll have a look today. They're looking great!",
            reactions: [
                { content: "❤️‍🔥", count: 1 },
                { content: "👌", count: 1 },
            ],
        },
    ],
];

const InvoiceItem = ({ value, className, ...otherProps }: ListBoxItemProps<InvoiceProps>) => {
    if (!value) return null;

    const getStatusColor = (status: InvoiceProps['status']): "gray" => {
        // For now, we'll use gray for all statuses to match the Badge type constraints
        return 'gray';
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <ListBoxItem
            href={`/invoices/${value.id}`}
            textValue={`${value.vendorName} – ${value.invoiceNumber}`}
            {...otherProps}
            className={(state) =>
                cx(
                    "relative flex flex-col gap-3 border-b border-secondary py-4 pr-4 pl-3 select-none",
                    state.isFocused && "outline-2 -outline-offset-2 outline-focus-ring",
                    state.isSelected && "bg-secondary",
                    typeof className === "function" ? className(state) : className,
                )
            }
        >
            <div className="flex justify-between items-start gap-4">
                <div className="flex items-center min-w-0 flex-1">
                    <div className="flex h-full w-5 items-center">
                        {!value.processed && <span className="size-2 rounded-full bg-fg-brand-secondary"></span>}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-primary truncate">{value.vendorName}</span>
                            <Badge size="sm" color={getStatusColor(value.status)} type="color">
                                {value.status}
                            </Badge>
                        </div>
                        <p className="text-xs text-tertiary">{value.invoiceNumber}</p>
                    </div>
                </div>
                <div className="text-right flex-shrink-0">
                    <div className="text-sm font-medium text-primary">{new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value.amount)}</div>
                    <div className="text-xs text-tertiary">Due {formatDate(value.dueDate)}</div>
                </div>
            </div>
        </ListBoxItem>
    );
};

export const Informational11 = () => {
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(invoices[0].id);
    const [isLeftColumnCollapsed, setIsLeftColumnCollapsed] = useState(false);
    
    const selectedInvoice = invoices.find(inv => inv.id === selectedInvoiceId);

    return (
        <div className="flex flex-col bg-primary">
            {/* Custom edge-to-edge header */}
            <header className="max-lg:hidden">
                <section className="flex h-16 w-full items-center justify-center bg-primary border-b border-secondary md:h-18">
                    <div className="flex w-full justify-between pr-3 pl-4">
                        <div className="flex flex-1 items-center gap-4">
                            <a
                                aria-label="Go to homepage"
                                href="/"
                                className="rounded-xs outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                            >
                                <UntitledLogo className="h-12" />
                            </a>

                            <nav>
                                <ul className="flex items-center gap-0.5">
                                    <li className="py-0.5">
                                        <NavItemBase href="/invoices" current={true} type="link">
                                            Invoices
                                        </NavItemBase>
                                    </li>
                                    <li className="py-0.5">
                                        <NavItemBase href="/pos" type="link">
                                            POS
                                        </NavItemBase>
                                    </li>
                                    <li className="py-0.5">
                                        <NavItemBase href="/exceptions" type="link">
                                            Exceptions
                                        </NavItemBase>
                                    </li>
                                    <li className="py-0.5">
                                        <NavItemBase href="/settings" type="link">
                                            Settings
                                        </NavItemBase>
                                    </li>
                                </ul>
                            </nav>
                        </div>

                        <div className="flex items-center gap-3">
                            <NavItemButton 
                                size="md" 
                                icon={Menu01} 
                                label={isLeftColumnCollapsed ? "Show sidebar" : "Hide sidebar"} 
                                href="#" 
                                tooltipPlacement="bottom"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setIsLeftColumnCollapsed(!isLeftColumnCollapsed);
                                }}
                            />
                            <NavItemButton size="md" icon={SearchLg} label="Search" href="#" tooltipPlacement="bottom" />
                        </div>
                    </div>
                </section>
            </header>
            <div className="mb-0 w-full">
                <div className="flex max-h-[calc(100vh-64px)] h-[calc(100vh-64px)] overflow-hidden ring-secondary lg:max-h-252 lg:rounded-none lg:shadow-none lg:ring-0">
                    {/* Left Sidebar */}
                    <div className={cx(
                        "relative flex-col overflow-hidden border-r border-secondary bg-primary transition-all duration-300 ease-in-out",
                        isLeftColumnCollapsed ? "hidden" : "hidden w-90 lg:flex"
                    )}>
                        <div className="flex items-start justify-between gap-4 bg-primary px-6 py-5">
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold text-primary">Invoices</span>
                                <Badge size="sm" type="color" color="gray">
                                    {invoices.filter(inv => !inv.processed).length}
                                </Badge>
                            </div>
                            <Button iconLeading={Edit05} color="secondary" size="md" />
                        </div>
                        <div className="px-4 pb-3">
                            <Input icon={SearchLg} shortcut aria-label="Search invoices" placeholder="Search invoices" size="sm" />
                        </div>
                        <ListBox
                            aria-label="Invoices"
                            selectionMode="single"
                            items={invoices}
                            selectedKeys={selectedInvoiceId ? [selectedInvoiceId] : []}
                            onSelectionChange={(keys) => setSelectedInvoiceId(Array.from(keys).at(0) as string)}
                            className="flex-1 overflow-y-auto"
                        >
                            {(item) => <InvoiceItem id={item.id} key={item.id} value={item} />}
                        </ListBox>
                    </div>
                    {/* Message Area + Right Sidebar Container */}
                    <div className="relative flex flex-1 overflow-hidden lg:max-h-252">
                        {/* Invoice Header - spans full width including right sidebar */}
                        <div className="absolute top-0 left-0 right-0 z-50 flex w-full flex-wrap items-start gap-4 border-b border-secondary bg-primary px-4 pt-5 pb-[21px] lg:min-h-[97px] lg:px-6">
                            <div className="flex flex-1 gap-3">
                                <div className="flex items-center justify-center w-12 h-12 bg-secondary rounded-lg border border-tertiary">
                                    <span className="text-lg font-bold text-primary">📄</span>
                                </div>
                                <div className="min-w-60">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-semibold text-primary">
                                            {selectedInvoice?.invoiceNumber || 'Select Invoice'}
                                        </span>
                                        {selectedInvoice && (
                                            <Badge 
                                                size="sm" 
                                                color="gray"
                                                type="color"
                                            >
                                                {selectedInvoice.status}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-tertiary">
                                        {selectedInvoice ? `${selectedInvoice.vendorName} • ${new Intl.NumberFormat('en-US', {
                                            style: 'currency',
                                            currency: 'USD',
                                        }).format(selectedInvoice.amount)}` : 'No invoice selected'}
                                    </p>
                                </div>
                            </div>
                            <div className="hidden gap-3 lg:flex">
                                <Button color="secondary" size="md">
                                    Download
                                </Button>
                                <Button color="secondary" size="md">
                                    Approve
                                </Button>
                                <Button size="md">Process</Button>
                            </div>
                            <TableRowActionsDropdown />
                        </div>
                        
                        {/* PDF Viewer Area */}
                        <div className="flex flex-1 flex-col pt-[97px]">
                            <div className="flex flex-1 overflow-hidden bg-primary">
                                {selectedInvoice ? (
                                    <div className="flex flex-1 flex-col">
                                        {/* PDF Viewer Controls */}
                                        <div className="flex items-center justify-between bg-secondary px-4 py-3 border-b border-tertiary">
                                            <div className="flex items-center gap-3">
                                                <Button size="sm" color="secondary">Zoom Out</Button>
                                                <span className="text-sm text-secondary">100%</span>
                                                <Button size="sm" color="secondary">Zoom In</Button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-secondary">Page 1 of 1</span>
                                                <Button size="sm" color="secondary">⬅</Button>
                                                <Button size="sm" color="secondary">➡</Button>
                                            </div>
                                        </div>
                                        
                                        {/* PDF Content Placeholder */}
                                        <div className="flex-1 overflow-auto bg-gray-100 p-8">
                                            <div className="mx-auto max-w-2xl bg-white shadow-lg">
                                                {/* Invoice Document Mock */}
                                                <div className="p-8 space-y-6">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h1 className="text-2xl font-bold text-gray-900">INVOICE</h1>
                                                            <p className="text-gray-600 mt-1">{selectedInvoice.invoiceNumber}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-gray-600">Invoice Date</p>
                                                            <p className="font-medium">{new Date().toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-8">
                                                        <div>
                                                            <h3 className="font-medium text-gray-900 mb-2">From:</h3>
                                                            <div className="text-gray-600">
                                                                <p className="font-medium">{selectedInvoice.vendorName}</p>
                                                                <p>123 Business Street</p>
                                                                <p>City, State 12345</p>
                                                                <p>Vendor Code: {selectedInvoice.vendorCode}</p>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h3 className="font-medium text-gray-900 mb-2">To:</h3>
                                                            <div className="text-gray-600">
                                                                <p className="font-medium">Your Company</p>
                                                                <p>456 Office Avenue</p>
                                                                <p>City, State 67890</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="border-t border-gray-200 pt-6">
                                                        <table className="w-full">
                                                            <thead>
                                                                <tr className="border-b border-gray-200">
                                                                    <th className="text-left py-2 text-gray-900 font-medium">Description</th>
                                                                    <th className="text-right py-2 text-gray-900 font-medium">Amount</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                <tr>
                                                                    <td className="py-2 text-gray-600">Professional Services</td>
                                                                    <td className="py-2 text-right text-gray-900 font-medium">
                                                                        {new Intl.NumberFormat('en-US', {
                                                                            style: 'currency',
                                                                            currency: 'USD',
                                                                        }).format(selectedInvoice.amount)}
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                            <tfoot>
                                                                <tr className="border-t border-gray-200">
                                                                    <td className="py-2 font-medium text-gray-900">Total</td>
                                                                    <td className="py-2 text-right font-bold text-gray-900 text-lg">
                                                                        {new Intl.NumberFormat('en-US', {
                                                                            style: 'currency',
                                                                            currency: 'USD',
                                                                        }).format(selectedInvoice.amount)}
                                                                    </td>
                                                                </tr>
                                                            </tfoot>
                                                        </table>
                                                    </div>
                                                    
                                                    <div className="text-sm text-gray-600">
                                                        <p><strong>Due Date:</strong> {selectedInvoice.dueDate.toLocaleDateString()}</p>
                                                        <p><strong>Status:</strong> {selectedInvoice.status}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-1 items-center justify-center bg-secondary">
                                        <div className="text-center">
                                            <div className="text-6xl mb-4">📄</div>
                                            <h3 className="text-lg font-medium text-primary mb-2">No Invoice Selected</h3>
                                            <p className="text-tertiary">Select an invoice from the left sidebar to view it here</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Right Sidebar - starts below the invoice header */}
                        <div className="hidden lg:flex w-80 flex-col border-l border-secondary bg-primary pt-[97px]">
                            <div className="flex flex-col p-6 overflow-y-auto">
                                <div className="text-lg font-semibold text-primary mb-4">Invoice Details</div>
                                
                                {selectedInvoice ? (
                                    <div className="space-y-6">
                                        {/* Vendor Information */}
                                        <div>
                                            <h4 className="text-sm font-medium text-secondary mb-3">Vendor Information</h4>
                                            <div className="space-y-2">
                                                <div>
                                                    <label className="text-xs text-tertiary">Company Name</label>
                                                    <Input 
                                                        value={selectedInvoice.vendorName} 
                                                        size="sm" 
                                                        className="mt-1"
                                                        isReadOnly
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-tertiary">Vendor Code</label>
                                                    <Input 
                                                        value={selectedInvoice.vendorCode} 
                                                        size="sm" 
                                                        className="mt-1"
                                                        isReadOnly
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Invoice Details */}
                                        <div>
                                            <h4 className="text-sm font-medium text-secondary mb-3">Invoice Information</h4>
                                            <div className="space-y-2">
                                                <div>
                                                    <label className="text-xs text-tertiary">Invoice Number</label>
                                                    <Input 
                                                        value={selectedInvoice.invoiceNumber} 
                                                        size="sm" 
                                                        className="mt-1"
                                                        isReadOnly
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-tertiary">Amount</label>
                                                    <Input 
                                                        value={new Intl.NumberFormat('en-US', {
                                                            style: 'currency',
                                                            currency: 'USD',
                                                        }).format(selectedInvoice.amount)} 
                                                        size="sm" 
                                                        className="mt-1"
                                                        isReadOnly
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-tertiary">Due Date</label>
                                                    <Input 
                                                        value={selectedInvoice.dueDate.toLocaleDateString()} 
                                                        size="sm" 
                                                        className="mt-1"
                                                        isReadOnly
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-tertiary">Status</label>
                                                    <div className="mt-1">
                                                        <Badge 
                                                            size="sm" 
                                                            color="gray"
                                                            type="color"
                                                        >
                                                            {selectedInvoice.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Processing Fields */}
                                        <div>
                                            <h4 className="text-sm font-medium text-secondary mb-3">Processing</h4>
                                            <div className="space-y-2">
                                                <div>
                                                    <label className="text-xs text-tertiary">GL Account</label>
                                                    <Input 
                                                        placeholder="Enter GL account" 
                                                        size="sm" 
                                                        className="mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-tertiary">Cost Center</label>
                                                    <Input 
                                                        placeholder="Enter cost center" 
                                                        size="sm" 
                                                        className="mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-tertiary">Approver</label>
                                                    <Input 
                                                        placeholder="Assign approver" 
                                                        size="sm" 
                                                        className="mt-1"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Actions */}
                                        <div className="border-t border-secondary pt-4">
                                            <div className="space-y-2">
                                                <Button size="sm" className="w-full">
                                                    Approve Invoice
                                                </Button>
                                                <Button size="sm" color="secondary" className="w-full">
                                                    Request Changes
                                                </Button>
                                                <Button size="sm" color="secondary-destructive" className="w-full">
                                                    Reject Invoice
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        {/* Processing History */}
                                        <div>
                                            <h4 className="text-sm font-medium text-secondary mb-3">Processing History</h4>
                                            <div className="space-y-2 text-xs">
                                                <div className="flex justify-between">
                                                    <span className="text-tertiary">Received</span>
                                                    <span className="text-secondary">2 days ago</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-tertiary">Auto-processed</span>
                                                    <span className="text-secondary">2 days ago</span>
                                                </div>
                                                {selectedInvoice.status !== 'pending' && (
                                                    <div className="flex justify-between">
                                                        <span className="text-tertiary">Status updated</span>
                                                        <span className="text-secondary">1 day ago</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="text-4xl mb-3">📋</div>
                                        <p className="text-tertiary">Select an invoice to view details</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
