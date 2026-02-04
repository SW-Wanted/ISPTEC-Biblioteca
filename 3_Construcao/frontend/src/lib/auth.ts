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
  session: { strategy: "jwt" },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
        if (!parsed.success) return null;

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
          },
        });

        if (!user) return null;
        if (user.status !== UserStatus.ACTIVE) return null;
        if (user.isBlocked) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.password);
        if (!ok) return null;

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
        select: { id: true },
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
        await prisma.user.update({
          where: { email },
          data: { lastLoginAt: new Date() },
        });
      }

      return true;
    },
    async jwt({ token }) {
      if (!token.email) return token;

      const dbUser = await prisma.user.findUnique({
        where: { email: token.email },
        select: {
          id: true,
          type: true,
          status: true,
          isBlocked: true,
          name: true,
          activationStatus: true,
        },
      });

      // ✅ Permitir PENDING para novos usuários completarem o cadastro
      // ❌ Bloquear apenas INACTIVE e usuários bloqueados
      if (
        !dbUser ||
        dbUser.status === UserStatus.INACTIVE ||
        dbUser.isBlocked
      ) {
        // Invalidate session
        return {};
      }

      token.id = dbUser.id;
      token.type = dbUser.type;
      token.name = dbUser.name;
      token.activationStatus = dbUser.activationStatus;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const typedToken = token as JWT;
        session.user.id = typedToken.id;
        session.user.type = typedToken.type;
        session.user.name = typedToken.name; // ✅ Adicionar name à sessão
        session.user.activationStatus = typedToken.activationStatus;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
