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
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const fontBytes = await fetch(FONT_URL).then((res) => res.arrayBuffer());
    const font = await pdfDoc.embedFont(fontBytes);

    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();

    // Helper
    const drawText = (text: string, x: number, y: number, size: number = 10, align: 'left' | 'right' | 'center' = 'left', color = rgb(0, 0, 0)) => {
        const textWidth = font.widthOfTextAtSize(text, size);
        let xPos = x;
        if (align === 'right') xPos = x - textWidth;
        if (align === 'center') xPos = x - textWidth / 2;

        page.drawText(text, { x: xPos, y, size, font, color });
        return textWidth;
    };

    // --- Header ---
    drawText('請求書', width / 2, height - 50, 24, 'center');

    // Right Column: Sender Info / Date / Invoice#
    const rightX = width - 50;
    let currentY = height - 50;

    const issueDate = billing.issue_date ? new Date(billing.issue_date).toLocaleDateString('ja-JP') : new Date().toLocaleDateString('ja-JP');
    drawText(issueDate, rightX, currentY, 10, 'right');
    currentY -= 15;
    drawText(`請求番号: ${billing.invoice_number || '-'}`, rightX, currentY, 10, 'right');
    currentY -= 20;

    // Sender Profile
    if (senderProfile) {
        drawText(senderProfile.name, rightX, currentY, 12, 'right'); // Bold-ish?
        currentY -= 15;
        if (senderProfile.registration_number) {
            drawText(`登録番号: ${senderProfile.registration_number}`, rightX, currentY, 10, 'right');
            currentY -= 15;
        }
        drawText(senderProfile.address, rightX, currentY, 9, 'right');
        currentY -= 12;
        if (senderProfile.phone) {
            drawText(`TEL: ${senderProfile.phone}`, rightX, currentY, 9, 'right');
            currentY -= 12;
        }
        if (senderProfile.email) {
            drawText(`Email: ${senderProfile.email}`, rightX, currentY, 9, 'right');
            currentY -= 12;
        }
    } else {
        // Fallback
        drawText('株式会社（未設定）', rightX, currentY, 12, 'right');
        currentY -= 15;
    }

    // Seal Image
    if (sealImageBytes) {
        try {
            const sealImage = await pdfDoc.embedPng(sealImageBytes);
            const sealDim = 50;
            // Position near sender name
            page.drawImage(sealImage, {
                x: rightX - 50, // adjusting position overlap
                y: height - 120, // rough guess
                width: sealDim,
                height: sealDim,
            });
        } catch (e) {
            console.error('Failed to embed seal image', e);
        }
    }

    // Left Column: Recipient
    const leftX = 50;
    const recipientName = (billing.client_info as any)?.name || billing.contractPartyB || '御中';
    drawText(`${recipientName}  御中`, leftX, height - 80, 16, 'left');

    // Subject / Total Box
    const totalBoxY = height - 160;
    drawText('下記の通りご請求申し上げます。', leftX, totalBoxY + 30, 10, 'left');

    const total = billing.total || billing.amount || 0;

    // Underline for Total
    const totalText = `ご請求金額   ¥${total.toLocaleString()} -`;
    drawText(totalText, leftX + 10, totalBoxY, 18, 'left');
    page.drawLine({
        start: { x: leftX, y: totalBoxY - 5 },
        end: { x: width / 2, y: totalBoxY - 5 },
        thickness: 1,
        color: rgb(0, 0, 0),
    });

    drawText(`お支払期限: ${billing.payment_deadline ? new Date(billing.payment_deadline).toLocaleDateString('ja-JP') : '-'}`, leftX, totalBoxY - 25, 10, 'left');


    // --- Details Table ---
    const tableTop = totalBoxY - 60;
    const colX = {
        desc: 50,
        qty: 320,
        unit: 360,
        price: 430,
        amount: 500
    };

    // Table Header
    page.drawRectangle({ x: 40, y: tableTop - 15, width: width - 80, height: 20, color: rgb(0.95, 0.95, 0.95) });
    drawText('品名', colX.desc, tableTop - 10, 10, 'left');
    drawText('数量', colX.qty, tableTop - 10, 10, 'right');
    drawText('単位', colX.unit, tableTop - 10, 10, 'center');
    drawText('単価', colX.price, tableTop - 10, 10, 'right');
    drawText('金額', colX.amount, tableTop - 10, 10, 'right');

    page.drawLine({ start: { x: 40, y: tableTop - 15 }, end: { x: width - 40, y: tableTop - 15 }, thickness: 1 });

    // Rows
    let y = tableTop - 35;
    const items = billing.items || [];

    if (items.length === 0 && billing.amount) {
        // Fallback for old data
        drawText('システム開発費用', colX.desc, y, 10, 'left');
        drawText('1', colX.qty, y, 10, 'right');
        drawText('式', colX.unit, y, 10, 'center');
        drawText(billing.amount.toLocaleString(), colX.price, y, 10, 'right');
        drawText(billing.amount.toLocaleString(), colX.amount, y, 10, 'right');
        y -= 20;
    } else {
        items.forEach(item => {
            const amount = item.quantity * item.unitPrice;
            drawText(item.description, colX.desc, y, 10, 'left');
            drawText(item.quantity.toString(), colX.qty, y, 10, 'right');
            drawText(item.unit, colX.unit, y, 10, 'center');
            drawText(item.unitPrice.toLocaleString(), colX.price, y, 10, 'right');
            drawText(amount.toLocaleString(), colX.amount, y, 10, 'right');

            // Tax indicator? (e.g. *)
            if (item.taxRate === 8) drawText('※', colX.desc - 10, y, 8, 'left');

            page.drawLine({ start: { x: 40, y: y - 5 }, end: { x: width - 40, y: y - 5 }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
            y -= 25;
        });
    }

    // --- Calculation Summary (Bottom Right) ---
    y -= 10;
    const summaryLabelX = 350;
    const summaryValX = 500;

    const subtotal = billing.subtotal || billing.amount || 0;
    const taxTotals = billing.tax_total || { tax8: 0, tax10: 0 };

    // Old data compat
    if (!billing.tax_total && billing.amount) {
        taxTotals.tax10 = Math.floor(billing.amount * 0.1);
    }

    drawText('小計', summaryLabelX, y, 10, 'left');
    drawText(`¥${subtotal.toLocaleString()}`, summaryValX, y, 10, 'right');
    y -= 15;

    if (taxTotals.tax10 > 0) {
        drawText('消費税 (10%)', summaryLabelX, y, 10, 'left');
        drawText(`¥${taxTotals.tax10.toLocaleString()}`, summaryValX, y, 10, 'right');
        y -= 15;
    }
    if (taxTotals.tax8 > 0) {
        drawText('消費税 (軽減8%)', summaryLabelX, y, 10, 'left');
        drawText(`¥${taxTotals.tax8.toLocaleString()}`, summaryValX, y, 10, 'right');
        y -= 15;
    }

    page.drawLine({ start: { x: summaryLabelX, y: y + 5 }, end: { x: width - 40, y: y + 5 }, thickness: 1 });
    y -= 5;

    drawText('合計', summaryLabelX, y, 12, 'left', rgb(0, 0, 0));
    drawText(`¥${total.toLocaleString()}`, summaryValX, y, 12, 'right', rgb(0, 0, 0));


    // --- Bank Info (Bottom Left) ---
    if (bankInfo) {
        const bankY = tableTop - 250; // approximate
        const bankX = 50;

        drawText('【お振込先】', bankX, bankY, 10, 'left');
        drawText(`${bankInfo.bank_name} ${bankInfo.branch_name}`, bankX, bankY - 15, 10, 'left');
        drawText(`${bankInfo.account_number}  ${bankInfo.account_holder}`, bankX, bankY - 30, 10, 'left');
        drawText('※振込手数料は貴社にてご負担願います。', bankX, bankY - 50, 8, 'left');
    }

    // Save
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `invoice_${billing.invoice_number || billing.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
