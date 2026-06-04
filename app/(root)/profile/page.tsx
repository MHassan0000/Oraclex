import { AuthCard } from "@/components/auth/auth-card";
import { ProfileForm } from "@/components/auth/profile-form";
import { requireUser } from "@/lib/auth/session";

export default async function ProfilePage() {
  const user = await requireUser("/profile");

  return (
    <div className="mx-auto max-w-xl">
      <AuthCard title="Profile settings" description="Keep your workspace identity up to date.">
        <ProfileForm
          initialName={(user?.user_metadata?.full_name as string | undefined) ?? null}
          email={user?.email ?? null}
        />
      </AuthCard>
    </div>
  );
}
