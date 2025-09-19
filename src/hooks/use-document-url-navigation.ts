import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Hook for managing document selection with URL synchronization
 * @param basePath - The base path for the document type (e.g., '/invoices', '/emails', '/files')
 * @returns Object with selectedId, updateSelectedId function, and URL sync logic
 */
export function useDocumentUrlNavigation(basePath: string) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selectedId, setSelectedId] = useState<string>('');

    // Sync URL with selectedId on mount and URL changes
    useEffect(() => {
        const urlId = searchParams.get('id');
        if (urlId && urlId !== selectedId) {
            setSelectedId(urlId);
        }
    }, [searchParams, selectedId]);

    // Update both state and URL when selection changes
    const updateSelectedId = useCallback((id: string) => {
        setSelectedId(id);
        
        const newSearchParams = new URLSearchParams(searchParams.toString());
        if (id) {
            newSearchParams.set('id', id);
        } else {
            newSearchParams.delete('id');
        }
        
        const newUrl = `${basePath}?${newSearchParams.toString()}`;
        router.replace(newUrl, { scroll: false });
    }, [basePath, router, searchParams]);

    // Helper to initialize selection with first item if none selected
    const initializeSelection = useCallback((items: Array<{ id: string }>) => {
        if (items.length > 0 && !selectedId) {
            updateSelectedId(items[0].id);
        }
    }, [selectedId, updateSelectedId]);

    // Helper for when deleting the currently selected item
    const handleDeletedSelection = useCallback((deletedId: string, remainingItems: Array<{ id: string }>) => {
        if (selectedId === deletedId) {
            updateSelectedId(remainingItems.length > 0 ? remainingItems[0].id : '');
        }
    }, [selectedId, updateSelectedId]);

    return {
        selectedId,
        updateSelectedId,
        initializeSelection,
        handleDeletedSelection
    };
}





