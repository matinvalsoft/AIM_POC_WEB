export default function ExportPage() {
    return (
        <div className="flex h-full items-center justify-center p-6">
            <div className="text-center">
                <div className="text-6xl mb-4">📤</div>
                <h2 className="text-xl font-semibold text-primary mb-2">Export</h2>
                <p className="text-tertiary mb-4">Oracle export jobs and history</p>
                <div className="space-y-2 text-sm text-tertiary">
                    <p>• Staging Queue → Oracle Job History</p>
                    <p>• Oracle rejects with fix links</p>
                    <p>• Invoices → Oracle only (MLP)</p>
                </div>
            </div>
        </div>
    );
}
