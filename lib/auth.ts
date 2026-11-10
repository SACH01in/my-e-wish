import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { checkAccountRateLimit } from "@/lib/rate-limit";
import { hashRecoveryCode, verifyTotpOnce } from "@/lib/mfa";
import { getClientAddressFromHeaders } from "@/lib/http";

export type AccountRole = "customer" | "support_admin" | "super_admin";

/** Auth.js credential configuration. Password hashes and email verification
 * are checked on the server; client input is never trusted as an account. */
export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        authenticatorCode: { label: "Authenticator or recovery code", type: "text" },
      },
      async authorize(credentials, request) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const remoteAddress = getClientAddressFromHeaders(request.headers || {});
        const allowed = await checkAccountRateLimit("login", email, remoteAddress, 8, 15 * 60 * 1000);
        if (!allowed) return null;

        const db = await getDb();
        const user = await db.collection("users").findOne<{
          _id: ObjectId;
          email: string;
          name: string;
          passwordHash: string;
          emailVerified: Date | null;
          role?: AccountRole;
          status?: string;
          authVersion?: number;
          mfaEnabled?: boolean;
          mfaSecret?: string;
          recoveryCodeHashes?: string[];
        }>({ email });
        if (!user?.emailVerified || user.status !== "active" || !(await compare(password, user.passwordHash))) return null;
        if (user.role === "support_admin" || user.role === "super_admin") {
          if (user.mfaEnabled && user.mfaSecret) {
            const code = credentials?.authenticatorCode || "";
            let verified = await verifyTotpOnce(user._id.toHexString(), user.mfaSecret, code);
            if (!verified && user.recoveryCodeHashes?.includes(hashRecoveryCode(code))) {
              const recoveryHash = hashRecoveryCode(code);
              const result = await db.collection<{ recoveryCodeHashes: string[] }>("users").updateOne(
                { _id: user._id, recoveryCodeHashes: recoveryHash },
                { $pull: { recoveryCodeHashes: { $eq: recoveryHash } } },
              );
              verified = result.modifiedCount === 1;
            }
            if (!verified) return null;
          }
        }

        return {
          id: user._id.toHexString(),
          email: user.email,
          name: user.name,
          role: user.role || "customer",
          authVersion: user.authVersion || 0,
          mfaEnabled: user.mfaEnabled || false,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as typeof user & { role?: AccountRole }).role || "customer";
        token.authVersion = (user as typeof user & { authVersion?: number }).authVersion || 0;
        token.mfaEnabled = (user as typeof user & { mfaEnabled?: boolean }).mfaEnabled || false;
      }
      if (token.sub && typeof token.authVersion === "number") {
        const db = await getDb();
        const current = await db.collection("users").findOne<{ authVersion?: number; status?: string; mfaEnabled?: boolean; role?: AccountRole }>(
          { _id: new ObjectId(token.sub) },
          { projection: { authVersion: 1, status: 1, role: 1, mfaEnabled: 1 } },
        );
        if (!current || current.status !== "active" || (current.authVersion || 0) !== token.authVersion) {
          token.sub = "";
          token.role = "customer";
        } else {
          token.role = current.role || "customer";
          token.mfaEnabled = current.mfaEnabled || false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
        session.user.role = (token.role as AccountRole) || "customer";
        session.user.mfaEnabled = token.mfaEnabled || false;
      }
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};
