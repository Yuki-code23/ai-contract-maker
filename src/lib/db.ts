import { supabase } from './supabase/client'


export interface Contract {
    id: number
    user_email: string
    party_a: string
    party_b: string
    status: string
    storage_path?: string
    auto_renewal: boolean
    deadline?: string
    title?: string
    metadata?: ContractMetadata
    contract_number?: string
    created_at?: string
    updated_at?: string
}

export interface Company {
    id: number
    user_email: string
    name: string
    postal_code?: string
    address?: string
    building?: string
    president_title?: string
    president_name?: string
    contact_person?: string
    email?: string
    phone?: string
    position?: string
    created_at?: string
    updated_at?: string
}

export interface Template {
    id: string
    user_email: string
    name: string
    party_a?: string
    party_b?: string
    address_a?: string
    address_b?: string
    president_position_a?: string
    president_name_a?: string
    president_position_b?: string
    president_name_b?: string
    content: string
    saved_at: string
    created_at?: string
    updated_at?: string
}

export interface ContractMetadata {
    end_date?: string
    notice_period_days?: number
    billing_amount?: number
    payment_deadline?: string // e.g., "翌月末"
    is_recurring?: boolean
    recurring_interval?: 'monthly' | 'quarterly' | 'yearly' | null
    [key: string]: any
}

export interface Billing {
    id: number
    contract_id?: number | null
    user_email: string
    issue_date?: string
    payment_deadline?: string
    payment_date?: string
    amount?: number
    invoice_number?: string
    items?: InvoiceItem[]
    client_info?: any
    subtotal?: number
    tax_total?: { tax8: number; tax10: number }
    total?: number
    status: 'Planned' | 'Approved' | 'Sent' | 'Paid'
    is_recurring?: boolean
    recurring_interval?: 'monthly' | 'quarterly' | 'yearly' | null
    pdf_url?: string
    billing_type?: 'receivable' | 'payable' // Default: receivable
    created_at?: string
    updated_at?: string
}

export interface InvoiceItem {
    description: string
    quantity: number
    unit: string
    unitPrice: number
    taxRate: 0 | 8 | 10
}

export interface CompanyProfile {
    name: string;
    address: string;
    contact_person?: string; // Legacy/Staff name
    president_title?: string;
    president_name?: string;
    staff_title?: string;
    staff_name?: string;
    registration_number?: string; // T+13
    phone?: string;
    email?: string;
    default_due_date?: string; // e.g., "end_of_next_month", "30_days"
}

export interface BankInfo {
    bank_name: string
    branch_name: string
    account_number: string
    account_holder: string
}

export interface UserSettings {
    id?: string
    user_email: string
    user_id?: string
    gemini_api_key?: string
    google_client_id?: string
    google_api_key?: string
    google_drive_folder_id?: string
    party_b_info?: any
    quick_access?: any
    company_profile?: CompanyProfile
    bank_info?: BankInfo
    seal_url?: string
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
