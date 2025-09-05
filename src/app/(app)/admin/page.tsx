export default function AdminPage() {
    return (
        <div className="flex h-full items-center justify-center p-6">
            <div className="text-center">
                <div className="text-6xl mb-4">⚙️</div>
                <h2 className="text-xl font-semibold text-primary mb-2">Admin</h2>
                <p className="text-tertiary mb-4">System administration</p>
                <div className="space-y-2 text-sm text-tertiary">
                    <p>• User management</p>
                    <p>• Bank mapping profiles</p>
                    <p>• Oracle integration settings</p>
                    <p>• Document processing rules</p>
                </div>
            </div>
        </div>
    );
}

