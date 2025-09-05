import { redirect } from "next/navigation";

export default function HomePage() {
    // Redirect to Documents as the default page
    redirect("/documents");
}