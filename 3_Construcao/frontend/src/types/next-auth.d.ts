import type { DefaultSession } from "next-auth"
import type { UserType } from "@prisma/client"

declare module "next-auth" {
  interface User {
    id: string
    type: UserType
  }

  interface Session {
    user: {
      id?: string
      type?: UserType
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    type?: UserType
  }
}
