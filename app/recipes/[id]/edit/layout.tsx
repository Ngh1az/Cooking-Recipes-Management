import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

type Params = Promise<{ id: string }>;

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Params;
}) {
  const currentUser = await getCurrentUser();
  const { id } = await params;

  if (!currentUser) {
    redirect(`/auth/login?next=${encodeURIComponent(`/recipes/${id}/edit`)}`);
  }

  return <>{children}</>;
}
