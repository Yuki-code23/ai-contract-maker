'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { Billing } from '@/lib/db';

export interface MonthlySalesData {
    year: number;
    month: number;
    monthLabel: string; // "2026年1月" or "2026/01"
    totalSales: number;
    invoiceCount: number;
}

export interface InvoiceDetail {
    id: number;
    invoice_number: string;
    client_name: string;
    issue_date: string;
    payment_deadline: string;
    total: number;
    status: string;
}

/**
 * Get monthly sales data for a specified date range
 * @param startYear - Optional start year (defaults to 12 months ago)
 * @param startMonth - Optional start month (1-12)
 * @param endYear - Optional end year (defaults to current year)
 * @param endMonth - Optional end month (1-12)
 */
export async function getMonthlySalesData(
    startYear?: number,
    startMonth?: number,
    endYear?: number,
    endMonth?: number
): Promise<{ success: boolean; data?: MonthlySalesData[]; error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return { success: false, error: 'Not authenticated' };
        }

        console.log('[DEBUG] Querying billings with:', {
            user_email: session.user.email,
            status_filter: 'NOT Planned'
        });

        const { data: billings, error } = await supabaseServer
            .from('billings')
            .select('*')
            .eq('user_email', session.user.email)
            .neq('status', 'Planned');

        if (error) {
            console.error('Error fetching billings:', error);
            return { success: false, error: error.message };
        }

        console.log('[DEBUG] getMonthlySalesData - Total billings fetched:', billings?.length);
        console.log('[DEBUG] getMonthlySalesData - User email:', session.user.email);

        // Log first few billings for inspection
        if (billings && billings.length > 0) {
            console.log('[DEBUG] Sample billings (first 3):', billings.slice(0, 3));
        } else {
            console.warn('[DEBUG] No billings found! Possible reasons:');
            console.warn('[DEBUG] 1. user_email does not match:', session.user.email);
            console.warn('[DEBUG] 2. All billings have status = "Planned"');
            console.warn('[DEBUG] 3. No billings exist in database');
        }

        // Group by month
        const monthlyData = new Map<string, { totalSales: number; invoiceCount: number; year: number; month: number }>();

        const now = new Date();

        // Calculate date range
        const rangeEndYear = endYear ?? now.getFullYear();
        const rangeEndMonth = endMonth ?? now.getMonth() + 1;
        const rangeStartYear = startYear ?? new Date(now.getFullYear(), now.getMonth() - 11, 1).getFullYear();
        const rangeStartMonth = startMonth ?? new Date(now.getFullYear(), now.getMonth() - 11, 1).getMonth() + 1;

        console.log('[DEBUG] Date range:', { rangeStartYear, rangeStartMonth, rangeEndYear, rangeEndMonth });

        // Initialize months in the specified range
        let currentDate = new Date(rangeStartYear, rangeStartMonth - 1, 1);
        const endDate = new Date(rangeEndYear, rangeEndMonth - 1, 1);

        while (currentDate <= endDate) {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            const key = `${year}-${month}`;
            monthlyData.set(key, { totalSales: 0, invoiceCount: 0, year, month });

            // Move to next month
            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        }

        // Aggregate billing data
        billings?.forEach((billing: Billing) => {
            console.log('[DEBUG] Billing:', {
                id: billing.id,
                issue_date: billing.issue_date,
                status: billing.status,
                total: billing.total,
                amount: billing.amount,
            });

            if (!billing.issue_date) return;

            const issueDate = new Date(billing.issue_date);
            const year = issueDate.getFullYear();
            const month = issueDate.getMonth() + 1;
            const key = `${year}-${month}`;

            if (monthlyData.has(key)) {
                const data = monthlyData.get(key)!;
                data.totalSales += billing.total || billing.amount || 0;
                data.invoiceCount += 1;
                console.log('[DEBUG] Added billing to month', key, '- New total:', data.totalSales);
            } else {
                console.log('[DEBUG] Billing month', key, 'not in 12-month range');
            }
        });

        // Convert to array and format
        const result: MonthlySalesData[] = Array.from(monthlyData.values())
            .map(item => ({
                year: item.year,
                month: item.month,
                monthLabel: `${item.year}/${String(item.month).padStart(2, '0')}`,
                totalSales: item.totalSales,
                invoiceCount: item.invoiceCount,
            }))
            .sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.month - b.month;
            });

        console.log('[DEBUG] Final result:', result);

        return { success: true, data: result };
    } catch (error) {
        console.error('Error in getMonthlySalesData:', error);
        return { success: false, error: 'Failed to fetch monthly sales data' };
    }
}

/**
 * Get monthly sales data for a specific company for a specified date range
 */
export async function getMonthlySalesDataByCompany(
    companyName: string,
    startYear?: number,
    startMonth?: number,
    endYear?: number,
    endMonth?: number
): Promise<{ success: boolean; data?: MonthlySalesData[]; error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return { success: false, error: 'Not authenticated' };
        }

        const { data: billings, error } = await supabaseServer
            .from('billings')
            .select('*')
            .eq('user_email', session.user.email)
            .neq('status', 'Planned');

        if (error) {
            console.error('Error fetching billings:', error);
            return { success: false, error: error.message };
        }

        // Filter by company name
        const filteredBillings = billings?.filter((billing: Billing) => {
            const clientName = (billing.client_info as any)?.name || '';
            return clientName === companyName;
        }) || [];

        // Group by month
        const monthlyData = new Map<string, { totalSales: number; invoiceCount: number; year: number; month: number }>();

        const now = new Date();

        // Calculate date range
        const rangeEndYear = endYear ?? now.getFullYear();
        const rangeEndMonth = endMonth ?? now.getMonth() + 1;
        const rangeStartYear = startYear ?? new Date(now.getFullYear(), now.getMonth() - 11, 1).getFullYear();
        const rangeStartMonth = startMonth ?? new Date(now.getFullYear(), now.getMonth() - 11, 1).getMonth() + 1;

        // Initialize months in the specified range
        let currentDate = new Date(rangeStartYear, rangeStartMonth - 1, 1);
        const endDate = new Date(rangeEndYear, rangeEndMonth - 1, 1);

        while (currentDate <= endDate) {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            const key = `${year}-${month}`;
            monthlyData.set(key, { totalSales: 0, invoiceCount: 0, year, month });

            // Move to next month
            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        }

        // Aggregate billing data
        filteredBillings.forEach((billing: Billing) => {
            if (!billing.issue_date) return;

            const issueDate = new Date(billing.issue_date);
            const year = issueDate.getFullYear();
            const month = issueDate.getMonth() + 1;
            const key = `${year}-${month}`;

            if (monthlyData.has(key)) {
                const data = monthlyData.get(key)!;
                data.totalSales += billing.total || billing.amount || 0;
                data.invoiceCount += 1;
            }
        });

        // Convert to array and format
        const result: MonthlySalesData[] = Array.from(monthlyData.values())
            .map(item => ({
                year: item.year,
                month: item.month,
                monthLabel: `${item.year}/${String(item.month).padStart(2, '0')}`,
                totalSales: item.totalSales,
                invoiceCount: item.invoiceCount,
            }))
            .sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.month - b.month;
            });

        return { success: true, data: result };
    } catch (error) {
        console.error('Error in getMonthlySalesDataByCompany:', error);
        return { success: false, error: 'Failed to fetch company sales data' };
    }
}

/**
 * Get list of unique company names from billings
 */
export async function getCompanyList(): Promise<{ success: boolean; data?: string[]; error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return { success: false, error: 'Not authenticated' };
        }

        const { data: billings, error } = await supabaseServer
            .from('billings')
            .select('client_info')
            .eq('user_email', session.user.email);

        if (error) {
            console.error('Error fetching billings:', error);
            return { success: false, error: error.message };
        }

        // Extract unique company names
        const companyNames = new Set<string>();
        console.log('[DEBUG Backend] Processing', billings?.length, 'billings for company list');

        billings?.forEach((billing: any, index: number) => {
            const name = billing.client_info?.name;
            if (name) {
                companyNames.add(name);
            } else {
                console.log(`[DEBUG Backend] Billing index ${index} has no company name in client_info:`, billing.client_info);
            }
        });

        const result = Array.from(companyNames).sort();
        console.log('[DEBUG Backend] Final company list:', result);
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in getCompanyList:', error);
        return { success: false, error: 'Failed to fetch company list' };
    }
}

/**
 * Get invoices for a specific month and optional company
 */
export async function getInvoicesByMonthAndCompany(
    year: number,
    month: number,
    companyName?: string
): Promise<{ success: boolean; data?: InvoiceDetail[]; error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return { success: false, error: 'Not authenticated' };
        }

        const { data: billings, error } = await supabaseServer
            .from('billings')
            .select('*')
            .eq('user_email', session.user.email)
            .neq('status', 'Planned');

        if (error) {
            console.error('Error fetching billings:', error);
            return { success: false, error: error.message };
        }

        // Filter by month and company
        const filteredBillings = billings?.filter((billing: Billing) => {
            if (!billing.issue_date) return false;

            const issueDate = new Date(billing.issue_date);
            const billingYear = issueDate.getFullYear();
            const billingMonth = issueDate.getMonth() + 1;

            if (billingYear !== year || billingMonth !== month) {
                return false;
            }

            if (companyName) {
                const clientName = (billing.client_info as any)?.name || '';
                return clientName === companyName;
            }

            return true;
        }) || [];

        // Map to InvoiceDetail
        const result: InvoiceDetail[] = filteredBillings.map((billing: Billing) => ({
            id: billing.id,
            invoice_number: billing.invoice_number || '-',
            client_name: (billing.client_info as any)?.name || '名無しの請求先',
            issue_date: billing.issue_date || '-',
            payment_deadline: billing.payment_deadline || '-',
            total: billing.total || billing.amount || 0,
            status: billing.status,
        }));

        // Sort by issue_date descending
        result.sort((a, b) => {
            if (a.issue_date === '-') return 1;
            if (b.issue_date === '-') return -1;
            return new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime();
        });

        return { success: true, data: result };
    } catch (error) {
        console.error('Error in getInvoicesByMonthAndCompany:', error);
        return { success: false, error: 'Failed to fetch invoices' };
    }
}
