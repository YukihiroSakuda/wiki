import { env } from "@/lib/env";
import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    // Azure Entra ID (production)
    ...(env.isAzureADConfigured()
      ? [
          AzureADProvider({
            clientId: env.AZURE_AD_CLIENT_ID,
            clientSecret: env.AZURE_AD_CLIENT_SECRET,
            tenantId: env.AZURE_AD_TENANT_ID,
          }),
        ]
      : []),

    // Local credentials (development fallback)
    ...(env.isDev()
      ? [
          CredentialsProvider({
            name: "Local Dev",
            credentials: {
              username: { label: "Username", type: "text", placeholder: "dev" },
              password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
              if (credentials?.username === "dev" && credentials?.password === "dev") {
                return {
                  id: "dev-user",
                  name: "Dev User",
                  email: "dev@localhost",
                  image: null,
                };
              }
              return null;
            },
          }),
        ]
      : []),
  ],

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub ?? "unknown";
      }
      return session;
    },
  },

  secret: env.NEXTAUTH_SECRET,
};
