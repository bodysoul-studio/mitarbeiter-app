import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "./admin-sidebar";
import { AdminNotifications } from "./admin-notifications";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || session.type !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <AdminSidebar />
      <AdminNotifications />
      <main className="flex-1 p-4 md:p-8 md:ml-64">{children}</main>
    </div>
  );
}
