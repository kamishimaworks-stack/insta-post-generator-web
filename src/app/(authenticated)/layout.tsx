"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { Navigation } from "@/components/Navigation";
import { usePathname } from "next/navigation";

export default function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isSetup = pathname === "/setup";

  return (
    <AuthGuard>
      {!isSetup && <Navigation />}
      <main className="flex-1 pb-20 sm:pb-4">{children}</main>
    </AuthGuard>
  );
}
