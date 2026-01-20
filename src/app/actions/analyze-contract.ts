'use server'

import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { supabaseServer } from "@/lib/supabase/server"
import { getUserSettings } from "./settings"
import { extractInvoiceDataFromContract } from "@/lib/gemini"
import { InvoiceItem } from "@/lib/db"

interface AnalyzeContractResult {
    success: boolean;
    error?: string;
    data?: {
        contract_id: number;
        contract_number: string;
        party_b: string;
        client_info?: {
            name: string;
            address?: string;
            president_title?: string;
            president_name?: string;
        };
        items: InvoiceItem[];
        payment_deadline?: string;
        amount?: number;
        is_recurring?: boolean;
        recurring_interval?: 'monthly' | 'quarterly' | 'yearly' | null;
    };
}

/**
 * Analyze contract and extract invoice data
 * 契約書を分析して請求書データを抽出
 */
export async function analyzeContractForInvoice(contractNumber: string): Promise<AnalyzeContractResult> {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return { success: false, error: "認証が必要です" }
        }

        // 1. Find contract by contract_number
        const { data: contract, error: contractError } = await supabaseServer
            .from('contracts')
            .select('*')
            .eq('user_email', session.user.email)
            .eq('contract_number', contractNumber)
            .single()

        if (contractError || !contract) {
            return { success: false, error: "契約書が見つかりませんでした" }
        }

        // 2. Get user settings for API key
        const settings = await getUserSettings()
        if (!settings?.gemini_api_key) {
            return { success: false, error: "Gemini APIキーが設定されていません。設定画面から登録してください。" }
        }

        // 3. Prepare client info from contract
        const clientInfo = {
            name: contract.party_b,
            address: contract.metadata?.address_b || undefined,
            president_title: contract.metadata?.president_position_b || undefined,
            president_name: contract.metadata?.president_name_b || undefined,
        }

        // 4. Extract invoice data from contract
        let invoiceData: {
            items: InvoiceItem[];
            payment_deadline?: string;
            amount?: number;
            is_recurring?: boolean;
            recurring_interval?: 'monthly' | 'quarterly' | 'yearly' | null;
        } = {
            items: [],
            is_recurring: false,
            recurring_interval: null
        }

        // Try to get contract text from storage_path or use metadata
        if (contract.storage_path) {
            // TODO: Implement fetching contract text from storage_path
            // For now, we'll use metadata as fallback
            console.warn("storage_path exists but fetching is not implemented yet")
        }

        // Use metadata if available
        if (contract.metadata) {
            const metadata = contract.metadata as any

            // If we have billing info in metadata, use AI to extract detailed items
            if (metadata.billing_amount || metadata.payment_deadline) {
                // Create a simple contract text from metadata for AI analysis
                const contractText = `
契約書番号: ${contract.contract_number}
契約タイトル: ${contract.title || ''}
乙（契約相手）: ${contract.party_b}
請求金額: ${metadata.billing_amount || '未指定'}円
支払期日: ${metadata.payment_deadline || '未指定'}
定期請求: ${metadata.is_recurring ? 'あり' : 'なし'}
請求頻度: ${metadata.recurring_interval || '未指定'}
                `.trim()

                try {
                    invoiceData = await extractInvoiceDataFromContract(contractText, settings.gemini_api_key)
                } catch (aiError) {
                    console.error("AI extraction failed, using metadata fallback:", aiError)
                    // Fallback to metadata
                    invoiceData = {
                        items: metadata.billing_amount ? [{
                            description: contract.title || `${contract.party_b}との契約`,
                            quantity: 1,
                            unit: '式',
                            unitPrice: metadata.billing_amount,
                            taxRate: 10
                        }] : [],
                        payment_deadline: metadata.payment_deadline,
                        amount: metadata.billing_amount,
                        is_recurring: metadata.is_recurring || false,
                        recurring_interval: metadata.recurring_interval || null
                    }
                }
            }
        }

        // 5. Return the result
        return {
            success: true,
            data: {
                contract_id: contract.id,
                contract_number: contract.contract_number,
                party_b: contract.party_b,
                client_info: clientInfo,
                items: invoiceData.items,
                payment_deadline: invoiceData.payment_deadline,
                amount: invoiceData.amount,
                is_recurring: invoiceData.is_recurring,
                recurring_interval: invoiceData.recurring_interval
            }
        }
    } catch (error) {
        console.error("Error analyzing contract for invoice:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "契約書の分析中にエラーが発生しました"
        }
    }
}
