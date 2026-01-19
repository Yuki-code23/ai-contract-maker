'use server'

import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { supabaseServer } from "@/lib/supabase/server"
import { Contract } from "@/lib/db"
import { extractContractMetadata } from "@/lib/gemini"
import { getUserSettings } from "./settings"

export async function getContracts() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    const { data, error } = await supabaseServer
        .from('contracts')
        .select('*')
        .eq('user_email', session.user.email)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching contracts:', error)
        throw new Error("Failed to fetch contracts")
    }

    // Convert keys to camelCase if necessary, or ensure DB columns match interface
    // Currently DB uses snake_case, interface uses camelCase (mostly)
    // Actually interface in db.ts matches potential snake_case mapping or we need to map it.
    // The previous db.ts interface used snake case for some fields?
    // Let's check db.ts again. It has party_a, party_b etc.
    // The interface has party_a, party_b.
    // However, the frontend uses partyA, partyB.
    // We should map it here to avoid frontend breakage.

    return data.map((c: any) => ({
        id: c.id,
        timestamp: new Date(c.created_at).toLocaleString('ja-JP'), // Convert to display format or keep ISO
        partyA: c.party_a,
        partyB: c.party_b,
        status: c.status,
        storagePath: c.storage_path,
        autoRenewal: c.auto_renewal,
        deadline: c.deadline,
        metadata: c.metadata,
        // Keep original created_at for sorting if needed
        createdAt: c.created_at
    }))
}

export async function getContract(id: number) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    const { data, error } = await supabaseServer
        .from('contracts')
        .select('*')
        .eq('id', id)
        .eq('user_email', session.user.email)
        .single()

    if (error) {
        console.error('Error fetching contract:', error)
        throw new Error("Failed to fetch contract")
    }

    return {
        id: data.id,
        timestamp: new Date(data.created_at).toLocaleString('ja-JP'),
        partyA: data.party_a,
        partyB: data.party_b,
        status: data.status,
        storagePath: data.storage_path,
        autoRenewal: data.auto_renewal,
        deadline: data.deadline,
        createdAt: data.created_at
    }
}

export async function createContract(contract: Omit<Contract, 'id' | 'user_email' | 'created_at' | 'updated_at'> | any) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    // Mapping frontend camelCase to DB snake_case
    const dbContract = {
        user_email: session.user.email,
        party_a: contract.partyA,
        party_b: contract.partyB,
        status: contract.status || '提案中',
        storage_path: contract.storagePath,
        auto_renewal: contract.autoRenewal,
        deadline: contract.deadline,
        metadata: contract.metadata || {} // Default to empty object or existing metadata
    }

    // Attempt to extract metadata if content is provided and no metadata exists (or we want to augment it)
    if (contract.content && Object.keys(dbContract.metadata).length === 0) {
        try {
            const settings = await getUserSettings();
            if (settings?.gemini_api_key) {
                const extracted = await extractContractMetadata(contract.content, settings.gemini_api_key);
                dbContract.metadata = extracted;
            }
        } catch (e) {
            console.error("Failed to extract metadata during contract creation:", e);
            // Continue without metadata
        }
    }

    const { data, error } = await supabaseServer
        .from('contracts')
        .insert(dbContract)
        .select()
        .single()

    if (error) {
        console.error('Error creating contract:', error)
        throw new Error("Failed to create contract")
    }

    return { success: true, contract: data }
}

export async function updateContract(id: number, contract: any) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    const dbContract: any = {}
    if (contract.partyA) dbContract.party_a = contract.partyA
    if (contract.partyB) dbContract.party_b = contract.partyB
    if (contract.status) dbContract.status = contract.status
    if (contract.storagePath) dbContract.storage_path = contract.storagePath
    if (contract.autoRenewal !== undefined) dbContract.auto_renewal = contract.autoRenewal
    if (contract.deadline) dbContract.deadline = contract.deadline

    const { error } = await supabaseServer
        .from('contracts')
        .update({
            ...dbContract,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_email', session.user.email)

    if (error) {
        console.error('Error updating contract:', error)
        throw new Error("Failed to update contract")
    }

    return { success: true }
}

export async function deleteContract(id: number) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    const { error } = await supabaseServer
        .from('contracts')
        .delete()
        .eq('id', id)
        .eq('user_email', session.user.email)

    if (error) {
        console.error('Error deleting contract:', error)
        throw new Error("Failed to delete contract")
    }

    return { success: true }
}
