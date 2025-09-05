import { redirect } from "next/navigation";

export default function DocumentsPage() {
    // Redirect to invoices by default
    redirect("/documents/invoices");
}

