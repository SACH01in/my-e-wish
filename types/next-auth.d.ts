import "next-auth";
import "next-auth/jwt";
import type { AccountRole } from "@/lib/auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AccountRole;
      mfaEnabled: boolean;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    role?: AccountRole;
    authVersion?: number;
    mfaEnabled?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AccountRole;
    authVersion?: number;
    mfaEnabled?: boolean;
  }
}
