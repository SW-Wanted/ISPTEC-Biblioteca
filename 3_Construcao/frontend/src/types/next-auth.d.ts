import type { DefaultSession } from "next-auth";
import type { UserType, AccountActivationStatus } from "@prisma/client";

declare module "next-auth" {
  interface User {
    id: string;
    type: UserType;
    activationStatus?: AccountActivationStatus;
  }

  interface Session {
    user: {
      id?: string;
      type?: UserType;
      activationStatus?: AccountActivationStatus;
      deletionPending?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    type?: UserType;
    activationStatus?: AccountActivationStatus;
    deletionPending?: boolean;
  }
}
