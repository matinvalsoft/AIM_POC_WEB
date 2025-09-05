"use client";

import { useState, useEffect } from 'react';
import { Modal } from '@/components/application/modals/modal';
import { Button } from '@/components/base/buttons/button';
import { X } from '@untitledui/icons';

export const KeyboardShortcutsHelp = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Show help with ? key (but not when typing)
            if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const target = e.target as HTMLElement;
                // Don't trigger if user is typing in an input field
                if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                    return;
                }
                e.preventDefault();
                setIsOpen(true);
            }
            
            // Close help with Escape
            if (e.key === 'Escape' && isOpen) {
                e.preventDefault();
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const shortcuts = [
        {
            category: 'Invoice Navigation',
            keys: [
                { combo: 'j', description: 'Next invoice (down)' },
                { combo: 'k', description: 'Previous invoice (up)' },
                { combo: 'Shift+j', description: 'Next invoice (from anywhere)' },
                { combo: 'Shift+k', description: 'Previous invoice (from anywhere)' },
            ]
        },
        {
            category: 'Search & Actions',
            keys: [
                { combo: '/', description: 'Focus search field' },
                { combo: 's', description: 'Save current invoice' },
                { combo: 'd', description: 'Focus first field in current tab' },
            ]
        },
        {
            category: 'Tab Navigation',
            keys: [
                { combo: '1-5', description: 'Switch to tab (1=Header, 2=Coding, etc.)' },
                { combo: '[', description: 'Previous tab in Details panel' },
                { combo: ']', description: 'Next tab in Details panel' },
            ]
        },
        {
            category: 'General',
            keys: [
                { combo: 'Tab', description: 'Focus first field (nav mode) / Next field (editing)' },
                { combo: 'Shift+Tab', description: 'Previous field (when editing forms)' },
                { combo: 'Esc', description: 'Exit field/Return to keyboard navigation' },
                { combo: '?', description: 'Show this help' },
            ]
        }
    ];

    return (
        <>
            {/* Help modal */}
            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="Keyboard Shortcuts"
                description="Navigate the invoice system quickly with these keyboard shortcuts"
            >
                <div className="space-y-6 max-h-96 overflow-y-auto">
                    {shortcuts.map((section) => (
                        <div key={section.category}>
                            <h3 className="text-sm font-semibold text-primary mb-3">
                                {section.category}
                            </h3>
                            <div className="space-y-2">
                                {section.keys.map((shortcut, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <span className="text-sm text-secondary">
                                            {shortcut.description}
                                        </span>
                                        <kbd className="px-2 py-1 text-xs font-mono bg-secondary text-tertiary border border-tertiary rounded">
                                            {shortcut.combo}
                                        </kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="flex justify-between items-center pt-6 border-t border-secondary mt-6">
                    <p className="text-xs text-tertiary">
                        <strong>Mode rule:</strong> Single-letter keys work only when not typing in a field
                    </p>
                    <Button
                        size="sm"
                        color="secondary"
                        iconLeading={X}
                        onClick={() => setIsOpen(false)}
                    >
                        Close
                    </Button>
                </div>
            </Modal>
        </>
    );
};
