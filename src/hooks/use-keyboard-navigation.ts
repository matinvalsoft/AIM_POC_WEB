"use client";

import { useEffect, useCallback, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export type NavigationMode = 'navigation' | 'typing';

interface UseKeyboardNavigationProps {
    invoices?: any[];
    selectedInvoiceId?: string;
    onSelectionChange?: (invoiceId: string) => void;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    onSave?: () => void;
}

export const useKeyboardNavigation = ({
    invoices = [],
    selectedInvoiceId,
    onSelectionChange,
    activeTab,
    onTabChange,
    onSave,
}: UseKeyboardNavigationProps = {}) => {
    const [mode, setMode] = useState<NavigationMode>('navigation');
    
    const searchInputRef = useRef<HTMLInputElement>(null);
    const detailsContainerRef = useRef<HTMLDivElement>(null);

    // Tab configuration
    const tabs = [
        { id: "extracted", label: "Header" },
        { id: "coding", label: "Coding" },
        { id: "raw", label: "Raw" },
        { id: "links", label: "Links" },
        { id: "activity", label: "Activity" }
    ];

    // Invoice navigation - j goes down (next), k goes up (previous)
    const moveToNextInvoice = useCallback(() => {
        if (!invoices.length || !onSelectionChange) return;
        
        const currentIndex = selectedInvoiceId ? invoices.findIndex(inv => inv.id === selectedInvoiceId) : -1;
        let nextIndex;
        
        if (currentIndex === -1) {
            // No selection, go to first
            nextIndex = 0;
        } else if (currentIndex < invoices.length - 1) {
            // Move down one (next)
            nextIndex = currentIndex + 1;
        } else {
            // At end, wrap to beginning
            nextIndex = 0;
        }
        
        onSelectionChange(invoices[nextIndex].id);
    }, [invoices, selectedInvoiceId, onSelectionChange]);

    const moveToPrevInvoice = useCallback(() => {
        if (!invoices.length || !onSelectionChange) return;
        
        const currentIndex = selectedInvoiceId ? invoices.findIndex(inv => inv.id === selectedInvoiceId) : -1;
        let prevIndex;
        
        if (currentIndex === -1) {
            // No selection, go to last
            prevIndex = invoices.length - 1;
        } else if (currentIndex > 0) {
            // Move up one (previous)
            prevIndex = currentIndex - 1;
        } else {
            // At beginning, wrap to end
            prevIndex = invoices.length - 1;
        }
        
        onSelectionChange(invoices[prevIndex].id);
    }, [invoices, selectedInvoiceId, onSelectionChange]);

    // Tab navigation with [ and ]
    const moveToPrevTab = useCallback(() => {
        if (mode !== 'navigation' || !onTabChange || !activeTab) return;
        
        const currentIndex = tabs.findIndex(t => t.id === activeTab);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        onTabChange(tabs[prevIndex].id);
    }, [mode, onTabChange, activeTab, tabs]);

    const moveToNextTab = useCallback(() => {
        if (mode !== 'navigation' || !onTabChange || !activeTab) return;
        
        const currentIndex = tabs.findIndex(t => t.id === activeTab);
        const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        onTabChange(tabs[nextIndex].id);
    }, [mode, onTabChange, activeTab, tabs]);

    // Search focus
    const focusSearch = useCallback(() => {
        if (mode !== 'navigation') return;
        
        if (searchInputRef.current) {
            searchInputRef.current.focus();
            setMode('typing');
        }
    }, [mode]);

    // Save action
    const handleSave = useCallback(() => {
        if (mode !== 'navigation' || !onSave) return;
        
        onSave();
    }, [mode, onSave]);

    // Focus first field in current tab
    const focusFirstField = useCallback(() => {
        if (mode !== 'navigation') return;
        
        // Find the first focusable element in the details container
        const container = detailsContainerRef.current;
        
        if (container) {
            // Look for various focusable elements including custom components
            const selectors = [
                'input:not([disabled]):not([type="hidden"])',
                'select:not([disabled])', 
                'textarea:not([disabled])',
                '[contenteditable]:not([contenteditable="false"])',
                '[role="textbox"]:not([disabled])',
                '[role="combobox"]:not([disabled])',
                '[tabindex]:not([tabindex="-1"]):not([disabled])',
                'button:not([disabled])',
                '[data-focusable="true"]'
            ].join(', ');
            
            const firstField = container.querySelector(selectors) as HTMLElement;
            
            if (firstField) {
                firstField.focus();
                setMode('typing');
            }
        }
    }, [mode]);

    // Switch to tab by number (stay in keyboard navigation mode)
    const switchToTabByNumber = useCallback((tabNumber: string) => {
        if (mode !== 'navigation' || !onTabChange) return;
        
        const tabIndex = parseInt(tabNumber) - 1; // Convert 1-5 to 0-4
        if (tabIndex >= 0 && tabIndex < tabs.length) {
            onTabChange(tabs[tabIndex].id);
        }
    }, [mode, onTabChange, tabs]);

    // Mode management
    const exitToNavigation = useCallback(() => {
        setMode('navigation');
        
        // Blur any focused input
        if (document.activeElement && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        
        // If we were in search, blur the search field
        if (searchInputRef.current === document.activeElement) {
            searchInputRef.current.blur();
        }
    }, []);

    // Handle input focus/blur to manage modes
    const handleInputFocus = useCallback(() => {
        setMode('typing');
    }, []);

    const handleInputBlur = useCallback((e?: FocusEvent) => {
        // Use a short delay to check if focus is moving to another input
        // This prevents immediate mode switching when focus moves between form elements
        setTimeout(() => {
            const activeElement = document.activeElement;
            
            // Don't switch to navigation mode if:
            // 1. Focus moved to another input/textarea/select
            // 2. Focus moved to a contenteditable element
            // 3. Focus moved to an element with role="textbox" or role="combobox"
            if (activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.tagName === 'SELECT' ||
                activeElement.getAttribute('contenteditable') === 'true' ||
                activeElement.getAttribute('role') === 'textbox' ||
                activeElement.getAttribute('role') === 'combobox' ||
                activeElement.hasAttribute('data-focusable')
            )) {
                // Focus is still in an editable element, stay in typing mode
                return;
            }
            
            // Focus has left editable elements, switch to navigation mode
            setMode('navigation');
        }, 50); // Small delay to allow focus to settle
    }, []);

    // Global keyboard event handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Always handle Esc
            if (e.key === 'Escape') {
                e.preventDefault();
                exitToNavigation();
                return;
            }

            // Check if we're currently focused on an input-like element
            const activeElement = document.activeElement;
            const isInInputElement = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.tagName === 'SELECT' ||
                activeElement.getAttribute('contenteditable') === 'true' ||
                activeElement.getAttribute('role') === 'textbox' ||
                activeElement.getAttribute('role') === 'combobox' ||
                activeElement.hasAttribute('data-focusable') ||
                // Check if we're in a combobox input (React Aria pattern)
                activeElement.closest('[role="combobox"]') ||
                // Check if we're in any input within the details container
                activeElement.closest('[data-keyboard-nav-container]')
            );

            // Skip if typing in an input (except for Esc handled above) OR currently focused on input element
            if (mode === 'typing' || isInInputElement) return;

            // Prevent default for our navigation keys
            const navKeys = ['j', 'k', '/', '[', ']', 's', 'd', '1', '2', '3', '4', '5', 'Tab'];
            if (navKeys.includes(e.key) || (e.shiftKey && ['J', 'K'].includes(e.key))) {
                e.preventDefault();
            }

            switch (e.key) {
                // Invoice navigation (global with Shift)
                case 'J':
                    if (e.shiftKey) moveToNextInvoice();
                    break;
                case 'K':
                    if (e.shiftKey) moveToPrevInvoice();
                    break;

                // List navigation (j/k for down/up)
                case 'j':
                    moveToNextInvoice();
                    break;
                case 'k':
                    moveToPrevInvoice();
                    break;

                // Search focus
                case '/':
                    focusSearch();
                    break;

                // Save
                case 's':
                    handleSave();
                    break;

                // Focus first field in details
                case 'd':
                    focusFirstField();
                    break;

                // Tab key to focus first field in current tab
                case 'Tab':
                    focusFirstField();
                    break;

                // Tab navigation by number
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                    switchToTabByNumber(e.key);
                    break;

                // Tab navigation
                case '[':
                    moveToPrevTab();
                    break;
                case ']':
                    moveToNextTab();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [
        mode, exitToNavigation, moveToNextInvoice, moveToPrevInvoice, 
        focusSearch, handleSave, focusFirstField, switchToTabByNumber, moveToPrevTab, moveToNextTab
    ]);

    return {
        // State
        mode,
        
        // Refs for components to use
        searchInputRef,
        detailsContainerRef,
        
        // Event handlers for inputs
        handleInputFocus,
        handleInputBlur,
        
        // Manual control methods
        exitToNavigation,
        
        // Tab configuration
        tabs,
    };
};
