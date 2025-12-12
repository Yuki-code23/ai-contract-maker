import { supabase } from './supabase/client'

export interface UserSettings {
    id?: string
    user_id: string
    gemini_api_key?: string
    google_client_id?: string
    google_api_key?: string
    google_drive_folder_id?: string
    created_at?: string
    updated_at?: string
}

/**
 * Get user settings from Supabase
 */
export async function getUserSettings(userId: string): Promise<UserSettings | null> {
    const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

    if (error) {
        if (error.code === 'PGRST116') {
            // No settings found, return null
            return null
        }
        console.error('Error fetching user settings:', error)
        throw error
    }

    return data
}

/**
 * Save or update user settings in Supabase
 */
export async function saveUserSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings> {
    // Check if settings already exist
    const existing = await getUserSettings(userId)

    if (existing) {
        // Update existing settings
        const { data, error } = await supabase
            .from('user_settings')
            .update({
                ...settings,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .select()
            .single()

        if (error) {
            console.error('Error updating user settings:', error)
            throw error
        }

        return data
    } else {
        // Insert new settings
        const { data, error } = await supabase
            .from('user_settings')
            .insert({
                user_id: userId,
                ...settings,
            })
            .select()
            .single()

        if (error) {
            console.error('Error inserting user settings:', error)
            throw error
        }

        return data
    }
}

/**
 * Migrate LocalStorage data to Supabase (one-time migration)
 */
export async function migrateLocalStorageToSupabase(userId: string): Promise<void> {
    // Check if migration already done
    const existing = await getUserSettings(userId)
    if (existing) {
        console.log('Settings already exist in Supabase, skipping migration')
        return
    }

    // Get data from LocalStorage
    const geminiApiKey = localStorage.getItem('geminiApiKey')
    const googleClientId = localStorage.getItem('googleClientId')
    const googleApiKey = localStorage.getItem('googleApiKey')
    const googleDriveFolderId = localStorage.getItem('googleDriveFolderId')

    // If no data in LocalStorage, skip migration
    if (!geminiApiKey && !googleClientId && !googleApiKey && !googleDriveFolderId) {
        console.log('No LocalStorage data to migrate')
        return
    }

    // Save to Supabase
    await saveUserSettings(userId, {
        gemini_api_key: geminiApiKey || undefined,
        google_client_id: googleClientId || undefined,
        google_api_key: googleApiKey || undefined,
        google_drive_folder_id: googleDriveFolderId || undefined,
    })

    console.log('Successfully migrated LocalStorage data to Supabase')
}
