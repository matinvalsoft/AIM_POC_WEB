export default function DocumentsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="h-full bg-primary">
            {children}
        </div>
    );
}

