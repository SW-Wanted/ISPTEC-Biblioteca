import type { DefaultSession } from "next-auth";
import type { UserType, AccountActivationStatus } from "@prisma/client";

declare module "next-auth" {
  interface User {
    id: string;
    type: UserType;
    activationStatus?: AccountActivationStatus;
    profileImageUrl?: string | null;
  }

  interface Session {
    user: {
      id?: string;
      type?: UserType;
      activationStatus?: AccountActivationStatus;
      deletionPending?: boolean;
      profileImageUrl?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    type?: UserType;
    activationStatus?: AccountActivationStatus;
    deletionPending?: boolean;
    profileImageUrl?: string | null;
  }
}
