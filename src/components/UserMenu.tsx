"use client"

import { signOut } from "next-auth/react"
import { useSession } from "next-auth/react"
import { useState } from "react"

export function UserMenu() {
    const { data: session } = useSession()
    const [isOpen, setIsOpen] = useState(false)

    if (!session?.user) return null

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
                {session.user.image && (
                    <img
                        src={session.user.image}
                        alt={session.user.name || "User"}
                        className="w-8 h-8 rounded-full"
                    />
                )}
                <span className="text-sm font-medium">{session.user.name}</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                        ログアウト
                    </button>
                </div>
            )}
        </div>
    )
}
