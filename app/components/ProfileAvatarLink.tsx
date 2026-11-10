import Link from "next/link";

export default function ProfileAvatarLink({
  name,
  role = "customer",
}: {
  name: string;
  role?: "customer" | "support_admin" | "super_admin";
}) {
  const initial = Array.from(name.trim())[0]?.toLocaleUpperCase() || "?";
  const isAdmin = role === "support_admin" || role === "super_admin";
  return (
    <Link
      className="profile-avatar-link"
      href={isAdmin ? "/admin" : "/profile"}
      aria-label={isAdmin ? "Open admin console" : `Open ${name.trim() ? `${name.trim()}'s` : "your"} profile`}
      data-tooltip={isAdmin ? "Admin console" : "My profile"}
    >
      <span aria-hidden="true">{initial}</span>
    </Link>
  );
}
