import { redirect } from "next/navigation";
import { getCurrentSession } from "../../../lib/session";
import { AppShell } from "../app-shell";
import { ProfileClient } from "./profile-client";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getCurrentSession();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  return (
    <AppShell locale={locale} title="Profile" subtitle="Manage your local account profile for this workspace.">
      <ProfileClient
        locale={locale}
        initial={{
          name: session.userName,
          email: session.userEmail,
          phone: "",
          companyName: "",
          plantName: "",
          address: "",
          state: "Maharashtra",
          district: "Pune",
          pinCode: ""
        }}
      />
    </AppShell>
  );
}
