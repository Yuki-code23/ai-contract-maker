'use server'

import { auth } from "@/auth"
import { supabaseServer } from "@/lib/supabase/server"
import { UserSettings } from "@/lib/db"

export async function getUserSettings() {
    const session = await auth()
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    const { data, error } = await supabaseServer
        .from('user_settings')
        .select('*')
        .eq('user_email', session.user.email)
        .single()

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error)
        throw new Error("Failed to fetch settings")
    }

    return data as UserSettings | null
}

export async function saveUserSettings(settings: Partial<UserSettings>) {
    const session = await auth()
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    // Check if exists
    const existing = await getUserSettings()

    if (existing) {
        const { error } = await supabaseServer
            .from('user_settings')
            .update({
                ...settings,
                updated_at: new Date().toISOString()
            })
            .eq('user_email', session.user.email)

        if (error) {
            console.error('Error updating settings:', error)
            throw new Error("Failed to update settings")
        }
    } else {
        const { error } = await supabaseServer
            .from('user_settings')
            .insert({
                user_email: session.user.email,
                ...settings
            })

        if (error) {
            console.error('Error creating settings:', error)
            throw new Error("Failed to create settings")
        }
    }

    return { success: true }
}

export async function migrateSettings(settings: Partial<UserSettings>) {
    // Simply use saveUserSettings logic but explicitly meant for migration
    return saveUserSettings(settings)
}
