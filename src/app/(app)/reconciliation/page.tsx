export default function ReconciliationPage() {
    return (
        <div className="flex h-full items-center justify-center p-6">
            <div className="text-center max-w-lg">
                <div className="text-6xl mb-4">⚖️</div>
                <h2 className="text-xl font-semibold text-primary mb-2">Reconciliation</h2>
                <p className="text-tertiary mb-4">Document matching and reconciliation</p>
                <div className="space-y-2 text-sm text-tertiary">
                    <p>• PO ↔ Invoice price/qty/line matching</p>
                    <p>• ASN ↔ PO qty/date reconciliation</p>
                    <p>• Bank ↔ Oracle statement matching</p>
                    <p>• Cross-document validation</p>
                </div>
            </div>
        </div>
    );
}

