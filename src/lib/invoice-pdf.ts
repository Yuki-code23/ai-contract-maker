import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { Billing, InvoiceItem, CompanyProfile, BankInfo } from './db';

const FONT_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/NotoSansJP-Regular.ttf';

export async function generateInvoicePDF(
    billing: Billing & { contractPartyB?: string },
    senderProfile?: CompanyProfile,
    bankInfo?: BankInfo,
    sealImageBytes?: ArrayBuffer
) {
    try {
        console.log('CRITICAL: PDF Generation Started', { billingId: billing.id });
        const pdfDoc = await PDFDocument.create();

        // Ensure fontkit is registered correctly
        try {
            console.log('Registering Fontkit...');
            pdfDoc.registerFontkit(fontkit as any);
        } catch (e) {
            console.warn('Fontkit registration warning:', e);
        }

        console.log('Fetching Font...');
        let fontBytes: ArrayBuffer | null = null;

        // Dynamic detection of window origin for local fallback
        const localOrigin = typeof window !== 'undefined' ? window.location.origin : '';

        const fontUrls = [
            `${localOrigin}/fonts/NotoSansJP-Regular.otf`,
            'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/SubsetOTF/JP/NotoSansJP-Regular.otf',
            'https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/static/NotoSansJP-Regular.ttf',
            'https://fonts.gstatic.com/s/notosansjp/v52/-Ky47oWBlWRoTMXNEFsSjY_H.ttf',
            FONT_URL
        ];

        for (const url of fontUrls) {
            if (!url) continue;
            try {
                console.log('Trying font URL:', url);
                const response = await fetch(url, { cache: 'force-cache' });
                if (response.ok) {
                    const bytes = await response.arrayBuffer();
                    if (bytes && bytes.byteLength > 10000) { // OTF is large, tiny bytes means error
                        fontBytes = bytes;
                        console.log('Successfully fetched font. Size:', fontBytes.byteLength);
                        break;
                    }
                }
            } catch (e) {
                console.warn(`Failed to fetch font from ${url}:`, e);
            }
        }

        let font: any;
        if (fontBytes && fontBytes.byteLength > 0) {
            try {
                console.log('Embedding Font...');
                font = await pdfDoc.embedFont(fontBytes);
                console.log('Font embedded successfully.');
            } catch (e: any) {
                console.error('Font embedding failed:', e);
            }
        }

        if (!font) {
            console.warn('Falling back to Standard Fonts (Helvetica). Japanese text will be missing.');
            font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        }

        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        console.log('Page size:', width, 'x', height);

        // Helper with extreme safety
        const drawText = (text: any, x: number, y: number, size: number = 10, align: 'left' | 'right' | 'center' = 'left', color = rgb(0, 0, 0)) => {
            try {
                const safeText = String(text || '');
                if (!safeText) return 0;

                const textWidth = font.widthOfTextAtSize(safeText, size);
                let xPos = x;
                if (align === 'right') xPos = x - textWidth;
                if (align === 'center') xPos = x - textWidth / 2;

                page.drawText(safeText, { x: xPos, y, size, font, color });
                return textWidth;
            } catch (e) {
                console.error('drawText internal failure:', text, e);
                return 0;
            }
        };

        // --- Header ---
        try {
            drawText('請求書', width / 2, height - 50, 24, 'center');
        } catch (e) { console.error('Error drawing header:', e); }

        // Right Column: Sender Info
        const rightX = width - 50;
        let currentY = height - 50;

        try {
            const issueDate = billing.issue_date ? new Date(billing.issue_date).toLocaleDateString('ja-JP') : new Date().toLocaleDateString('ja-JP');
            drawText(issueDate, rightX, currentY, 10, 'right');
            currentY -= 15;
            drawText(`請求番号: ${billing.invoice_number || '-'}`, rightX, currentY, 10, 'right');
            currentY -= 20;

            if (senderProfile) {
                drawText(senderProfile.name || '', rightX, currentY, 12, 'right');
                currentY -= 15;
                if (senderProfile.registration_number) {
                    drawText(`登録番号: ${senderProfile.registration_number}`, rightX, currentY, 10, 'right');
                    currentY -= 15;
                }
                drawText(senderProfile.address || '', rightX, currentY, 9, 'right');
                currentY -= 12;
            } else {
                drawText('（自社名未設定）', rightX, currentY, 12, 'right');
                currentY -= 15;
            }
        } catch (e) { console.error('Error drawing sender section:', e); }

        // Seal Image
        if (sealImageBytes && sealImageBytes.byteLength > 0) {
            try {
                console.log('Processing seal image, bytes:', sealImageBytes.byteLength);
                let sealImage;
                try {
                    sealImage = await pdfDoc.embedPng(sealImageBytes);
                } catch (pngError) {
                    console.log('Seal: not PNG, trying JPG...');
                    sealImage = await pdfDoc.embedJpg(sealImageBytes);
                }

                const sealDim = 50;
                page.drawImage(sealImage, {
                    x: rightX - 60,
                    y: height - 130,
                    width: sealDim,
                    height: sealDim,
                });
                console.log('Seal image embedded.');
            } catch (e) {
                console.error('Non-fatal: Seal embedding failed:', e);
            }
        }

        // Left Column: Recipient
        try {
            const leftX = 50;
            const recipientName = (billing.client_info as any)?.name || billing.contractPartyB || '御中';
            drawText(`${recipientName}  御中`, leftX, height - 80, 16, 'left');

            const totalBoxY = height - 160;
            drawText('下記の通りご請求申し上げます。', leftX, totalBoxY + 30, 10, 'left');

            const subtotalVal = Number(billing.subtotal || billing.amount || 0);
            const taxTotalsVal = (billing.tax_total as any) || { tax8: 0, tax10: 0 };
            if (!billing.tax_total && billing.amount) {
                taxTotalsVal.tax10 = Math.floor(subtotalVal * 0.1);
            }
            const billingTotal = Number(billing.total || (subtotalVal + Number(taxTotalsVal.tax8 || 0) + Number(taxTotalsVal.tax10 || 0)));

            const totalText = `ご請求金額   ¥${billingTotal.toLocaleString()} -`;
            drawText(totalText, leftX + 10, totalBoxY, 18, 'left');
            page.drawLine({
                start: { x: leftX, y: totalBoxY - 5 },
                end: { x: width / 2, y: totalBoxY - 5 },
                thickness: 1,
                color: rgb(0, 0, 0),
            });

            drawText(`お支払期限: ${billing.payment_deadline ? new Date(billing.payment_deadline).toLocaleDateString('ja-JP') : '-'}`, leftX, totalBoxY - 25, 10, 'left');

            // Table
            const tableTop = totalBoxY - 60;
            const colX = { desc: 50, qty: 280, unit: 320, price: 380, rate: 440, amount: 500 };

            page.drawRectangle({ x: 40, y: tableTop - 15, width: width - 80, height: 20, color: rgb(0.95, 0.95, 0.95) });
            drawText('品名', colX.desc, tableTop - 10, 10, 'left');
            drawText('数量', colX.qty, tableTop - 10, 10, 'right');
            drawText('単位', colX.unit, tableTop - 10, 10, 'center');
            drawText('単価', colX.price, tableTop - 10, 10, 'right');
            drawText('税率', colX.rate, tableTop - 10, 10, 'center');
            drawText('金額', colX.amount, tableTop - 10, 10, 'right');

            page.drawLine({ start: { x: 40, y: tableTop - 15 }, end: { x: width - 40, y: tableTop - 15 }, thickness: 1 });

            let yPos = tableTop - 35;
            const itemsList = billing.items || [];

            // For calculating taxable bases
            let taxable10 = 0;
            let taxable8 = 0;

            if (itemsList.length === 0 && subtotalVal > 0) {
                drawText('ご請求費用', colX.desc, yPos, 10, 'left');
                drawText('1', colX.qty, yPos, 10, 'right');
                drawText('式', colX.unit, yPos, 10, 'center');
                drawText(subtotalVal.toLocaleString(), colX.price, yPos, 10, 'right');
                drawText('10%', colX.rate, yPos, 10, 'center');
                drawText(subtotalVal.toLocaleString(), colX.amount, yPos, 10, 'right');
                taxable10 = subtotalVal;
                yPos -= 25;
            } else {
                itemsList.forEach(item => {
                    const price = Number(item.unitPrice || 0);
                    const qty = Number(item.quantity || 0);
                    const rowAmount = qty * price;
                    const rate = item.taxRate || 10;

                    if (rate === 10) taxable10 += rowAmount;
                    if (rate === 8) taxable8 += rowAmount;

                    drawText(item.description || '', colX.desc, yPos, 10, 'left');
                    drawText(qty.toString(), colX.qty, yPos, 10, 'right');
                    drawText(item.unit || '', colX.unit, yPos, 10, 'center');
                    drawText(price.toLocaleString(), colX.price, yPos, 10, 'right');
                    drawText(`${rate}%`, colX.rate, yPos, 10, 'center');
                    drawText(rowAmount.toLocaleString(), colX.amount, yPos, 10, 'right');
                    yPos -= 25;
                });
            }

            // Summary Bottom
            yPos -= 10;
            drawText('小計 (税抜)', 350, yPos, 10, 'left');
            drawText(`¥${subtotalVal.toLocaleString()}`, 500, yPos, 10, 'right');
            yPos -= 15;

            // Invoice System Requirement: Show Taxable Base per Rate
            if (taxable10 > 0) {
                drawText('10%対象金額', 350, yPos, 10, 'left');
                drawText(`¥${taxable10.toLocaleString()}`, 500, yPos, 10, 'right');
                yPos -= 12;
                drawText('消費税 (10%)', 350, yPos, 10, 'left');
                drawText(`¥${Number(taxTotalsVal.tax10).toLocaleString()}`, 500, yPos, 10, 'right');
                yPos -= 15;
            }
            if (taxable8 > 0) {
                drawText('8%対象金額', 350, yPos, 10, 'left');
                drawText(`¥${taxable8.toLocaleString()}`, 500, yPos, 10, 'right');
                yPos -= 12;
                drawText('消費税 (軽減8%)', 350, yPos, 10, 'left');
                drawText(`¥${Number(taxTotalsVal.tax8).toLocaleString()}`, 500, yPos, 10, 'right');
                yPos -= 15;
            }

            page.drawLine({ start: { x: 350, y: yPos + 5 }, end: { x: width - 40, y: yPos + 5 }, thickness: 1 });
            yPos -= 5;
            drawText('合計', 350, yPos, 12, 'left', rgb(0, 0, 0));
            drawText(`¥${billingTotal.toLocaleString()}`, 500, yPos, 12, 'right', rgb(0, 0, 0));

            // Bank
            if (bankInfo) {
                const bankY = tableTop - 350;
                drawText('【お振込先】', 50, bankY, 10, 'left');
                drawText(`${bankInfo.bank_name || ''} ${bankInfo.branch_name || ''}`, 50, bankY - 15, 10, 'left');
                drawText(`${bankInfo.account_number || ''}  ${bankInfo.account_holder || ''}`, 50, bankY - 30, 10, 'left');
            }
        } catch (e) { console.error('Error drawing main content:', e); }

        console.log('Saving PDF...');
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `invoice_${billing.invoice_number || billing.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('PDF Download Triggered');
    } catch (error: any) {
        console.error('FATAL: PDF Generation Failed', error);
        throw new Error(`PDF生成中に致命的なエラーが発生しました: ${error.message}`);
    }
}
