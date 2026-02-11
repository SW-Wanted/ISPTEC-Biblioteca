import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { UserStatus, UserType } from "@prisma/client";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authOptions: NextAuthOptions = {
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: "consent",
                access_type: "offline",
                response_type: "code",
                hd: "isptec.co.ao", // Restringir apenas ao domínio ISPTEC
              },
            },
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          throw new Error("InvalidCredentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            type: true,
            status: true,
            isBlocked: true,
            deletionScheduledAt: true,
          },
        });

        if (!user) {
          throw new Error("InvalidCredentials");
        }

        const ok = await bcrypt.compare(parsed.data.password, user.password);
        if (!ok) {
          throw new Error("InvalidCredentials");
        }

        if (user.isBlocked) {
          throw new Error("AccountBlocked");
        }

        // Permitir INACTIVE se tiver eliminação agendada (para cancelar)
        if (user.status !== UserStatus.ACTIVE) {
          if (user.status === UserStatus.INACTIVE && user.deletionScheduledAt) {
            // Permitir login para cancelar eliminação
          } else {
            throw new Error("AccountInactive");
          }
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          type: user.type,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      const email = user.email;
      if (!email) return false;

      // ✅ CRÍTICO: Apenas emails institucionais @isptec.co.ao
      if (!email.endsWith("@isptec.co.ao")) {
        console.error(
          "❌ Tentativa de login com email não institucional:",
          email,
        );
        return false; // Bloquear login
      }

      const existing = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          status: true,
          isBlocked: true,
          deletionScheduledAt: true,
        },
      });

      if (!existing) {
        const randomPassword =
          requireEnv("NEXTAUTH_SECRET").slice(0, 16) + Date.now().toString(16);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        const name =
          user.name ??
          (typeof profile?.name === "string" ? profile.name : null) ??
          email.split("@")[0];

        // Determinar tipo de usuário baseado no email
        // Apenas STUDENT e TEACHER precisam de validação
        const userType = UserType.STUDENT; // Por padrão, usuários são estudantes
        const needsValidation =
          userType === UserType.STUDENT || userType === UserType.TEACHER;

        // ✅ Criar usuário
        await prisma.user.create({
          data: {
            email,
            name,
            password: hashedPassword,
            type: userType,
            status: needsValidation ? UserStatus.PENDING : UserStatus.ACTIVE,
            activationStatus: needsValidation ? "PENDING_DOCUMENTS" : "ACTIVE",
            lastLoginAt: new Date(),
          },
        });

        console.log(
          needsValidation
            ? `✅ Novo usuário criado (PENDING_DOCUMENTS): ${email}`
            : `✅ Novo usuário criado (ACTIVE): ${email}`,
        );
      } else {
        // Bloquear se bloqueado
        if (existing.isBlocked) {
          console.error("❌ Tentativa de login com conta bloqueada:", email);
          return false;
        }
        // Permitir INACTIVE com eliminação agendada (para cancelar)
        if (
          existing.status === UserStatus.INACTIVE &&
          !existing.deletionScheduledAt
        ) {
          console.error("❌ Tentativa de login com conta inativa:", email);
          return false;
        }

        await prisma.user.update({
          where: { email },
          data: { lastLoginAt: new Date() },
        });
      }

      return true;
    },
    async jwt({ token, trigger }) {
      if (!token.email) return token;

      // Apenas buscar dados do DB quando necessário (não em toda requisição)
      if (trigger === "signIn" || trigger === "update" || !token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: {
            id: true,
            type: true,
            status: true,
            isBlocked: true,
            name: true,
            activationStatus: true,
            deletionScheduledAt: true,
            profileImageUrl: true,
          },
        });

        if (!dbUser || dbUser.isBlocked) {
          return {};
        }

        if (
          dbUser.status === UserStatus.INACTIVE &&
          !dbUser.deletionScheduledAt
        ) {
          return {};
        }

        token.id = dbUser.id;
        token.type = dbUser.type;
        token.name = dbUser.name;
        token.activationStatus = dbUser.activationStatus;
        token.deletionPending = !!dbUser.deletionScheduledAt;
        token.profileImageUrl = dbUser.profileImageUrl;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const typedToken = token as JWT;
        session.user.id = typedToken.id;
        session.user.type = typedToken.type;
        session.user.name = typedToken.name;
        session.user.activationStatus = typedToken.activationStatus;
        session.user.deletionPending = typedToken.deletionPending;
        session.user.profileImageUrl = typedToken.profileImageUrl;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth-error",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
