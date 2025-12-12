import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isOnLoginPage = nextUrl.pathname === '/login'

            if (isOnLoginPage) {
                if (isLoggedIn) {
                    // Redirect logged-in users away from login page
                    return Response.redirect(new URL('/', nextUrl))
                }
                return true
            }

            // All other pages require authentication
            return isLoggedIn
        },
        async jwt({ token, user, account }) {
            // Initial sign in
            if (user) {
                token.id = user.id
                token.email = user.email
                token.name = user.name
                token.picture = user.image
            }
            return token
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string
                session.user.email = token.email as string
                session.user.name = token.name as string
                session.user.image = token.picture as string
            }
            return session
        },
    },
    session: {
        strategy: "jwt",
    },
})
