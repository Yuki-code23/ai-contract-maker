import { GoogleGenerativeAI } from "@google/generative-ai";
import { ContractMetadata, InvoiceItem } from "./db";


export async function extractPartiesFromText(text: string, apiKey: string): Promise<{ partyA: string; partyB: string; addressA: string; addressB: string; presidentPositionA: string; presidentNameA: string; presidentPositionB: string; presidentNameB: string }> {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
      以下の契約書テキストから、「甲」（Party A）と「乙」（Party B）の「名称」と「住所（所在地）」を抽出してください。
      また、「甲」（Party A）と「乙」（Party B）それぞれの「代表者の役職」と「代表者の氏名」も抽出してください。
      結果は必ず以下のJSON形式のみで返してください。Markdownのコードブロックや説明文は不要です。
      
      {
        "partyA": "甲の名称",
        "addressA": "甲の住所（所在地）",
        "presidentPositionA": "甲の代表者の役職",
        "presidentNameA": "甲の代表者の氏名",
        "partyB": "乙の名称",
        "addressB": "乙の住所（所在地）",
        "presidentPositionB": "乙の代表者の役職",
        "presidentNameB": "乙の代表者の氏名"
      }
      
      もし見つからない場合は空文字を返してください。
      
      契約書テキスト:
      ${text.substring(0, 10000)}
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();
        console.log("Gemini Raw Response:", textResponse);

        // Clean up the response to ensure we only have the JSON part
        // 1. Remove markdown code blocks if present
        let cleanJson = textResponse.replace(/```json\n?|\n?```/g, '').trim();

        // 2. Find the first '{' and the last '}'
        const firstOpen = cleanJson.indexOf('{');
        const lastClose = cleanJson.lastIndexOf('}');

        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            cleanJson = cleanJson.substring(firstOpen, lastClose + 1);

            try {
                const parsed = JSON.parse(cleanJson);
                return {
                    partyA: parsed.partyA || "",
                    partyB: parsed.partyB || "",
                    addressA: parsed.addressA || "",
                    addressB: parsed.addressB || "",
                    presidentPositionA: parsed.presidentPositionA || "",
                    presidentNameA: parsed.presidentNameA || "",
                    presidentPositionB: parsed.presidentPositionB || "",
                    presidentNameB: parsed.presidentNameB || "",
                };
            } catch (parseError) {
                console.error("JSON Parse Error:", parseError);
                console.error("Failed JSON string:", cleanJson);
                // Fallback: try to fix common JSON issues if needed, or just return empty
            }
        }

        return { partyA: "", partyB: "", addressA: "", addressB: "", presidentPositionA: "", presidentNameA: "", presidentPositionB: "", presidentNameB: "" };
    } catch (error) {
        console.error("Error extracting parties:", error);
        return { partyA: "", partyB: "", addressA: "", addressB: "", presidentPositionA: "", presidentNameA: "", presidentPositionB: "", presidentNameB: "" };
    }
}

// Utility for exponential backoff
async function retryWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let retries = 0;
    while (true) {
        try {
            return await operation();
        } catch (error: any) {
            // Check if it's a 503 Service Unavailable or 429 Too Many Requests
            const isOverloaded = error.message?.includes('503') || error.message?.includes('429') || error.status === 503 || error.status === 429;

            if (isOverloaded && retries < maxRetries) {
                retries++;
                const delay = baseDelay * Math.pow(2, retries - 1) + (Math.random() * 1000); // Add jitter
                console.warn(`Gemini API overloaded. Retrying in ${Math.round(delay)}ms... (Attempt ${retries}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            // If we've exhausted retries or it's a 429 error and we want to stop trying
            if (error.message?.includes('429') || error.status === 429) {
                const match = error.message?.match(/retry in ([0-9.]+)s/);
                const waitTime = match ? match[1] : 'しばらく';
                console.error(`Gemini API Limit Exceeded. Required wait: ${waitTime}s`);
                throw new Error(`Gemini APIの利用制限（無料枠の制限など）に達しました。約${Number(waitTime) > 0 ? Math.ceil(Number(waitTime)) : 30}秒待ってから再度お試しください。`);
            }

            throw error;
        }
    }
}

export async function extractContractMetadata(text: string, apiKey: string): Promise<ContractMetadata> {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
      以下の契約書テキストから、以下の情報を抽出してJSON形式で返してください。
      
      抽出項目:
      1. end_date: 契約終了日 (YYYY-MM-DD形式)
      2. notice_period_days: 解約通知期限 (日数。例: "1ヶ月前"なら30, "3ヶ月前"なら90)
      3. billing_amount: 請求金額 (数値のみ。月額費用など定常的なもの。一時金は除外してください)
      4. payment_deadline: 支払期日 (例: "翌月末", "当月末", "翌月20日" などの文字列)
      5. is_recurring: 定期的な請求（月額、四半期払い、年額など）かどうかの判定 (true or false)
      6. recurring_interval: 定期的な請求の場合の頻度 ("monthly", "quarterly", "yearly")。不明または一時的なものはnull。
      
      契約書テキスト:
      ${text.substring(0, 15000)}

      出力フォーマットのみを返してください。Markdownコードブロックは不要です。
      {
        "end_date": "YYYY-MM-DD" or null,
        "notice_period_days": number or null,
        "billing_amount": number or null,
        "payment_deadline": "string" or null,
        "is_recurring": boolean,
        "recurring_interval": "monthly" | "quarterly" | "yearly" | null
      }
    `;

        const result = await retryWithExponentialBackoff(() => model.generateContent(prompt));
        const response = await result.response;
        const textResponse = response.text();
        console.log("Gemini Metadata Extraction Response:", textResponse);

        let cleanJson = textResponse.replace(/```json\n?|\n?```/g, '').trim();
        const firstOpen = cleanJson.indexOf('{');
        const lastClose = cleanJson.lastIndexOf('}');

        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            cleanJson = cleanJson.substring(firstOpen, lastClose + 1);
            try {
                return JSON.parse(cleanJson);
            } catch (e) {
                console.error("JSON Parse Error in metadata extraction:", e);
                return {};
            }
        }
        return {};
    } catch (error) {
        console.error("Error extracting contract metadata:", error);
        return {};
    }
}

export async function generateContractResponse(
    userMessage: string,
    conversationHistory: Array<{ role: 'user' | 'model'; parts: string }>,
    apiKey: string
): Promise<string> {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // System instruction for contract generation
        const systemInstruction = `あなたは契約書作成の専門家です。ユーザーの要望に応じて、適切な契約書の内容を提案し、作成をサポートしてください。

【重要】出力形式について
回答は必ず以下の形式で出力してください。

<CONTRACT>
ここに契約書の本文（タイトル、条文など）のみを記述してください。
</CONTRACT>

<COMMENT>
ここにユーザーへのメッセージ、契約書の解説、補足事項などを記述してください。
</COMMENT>

契約書の作成・修正が必要な場合は<CONTRACT>タグ内にその内容を、それ以外のアドバイスや返答は<COMMENT>タグ内に記述してください。`;

        // Build conversation history
        const history = conversationHistory.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.parts }]
        }));

        // Start chat with history
        const chat = model.startChat({
            history: history,
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.7,
            },
        });

        // Send message with system instruction prepended to first message
        const fullMessage = conversationHistory.length === 0
            ? `${systemInstruction}\n\nユーザー: ${userMessage}`
            : userMessage;

        // Wrap sendMessage with retry logic
        const result = await retryWithExponentialBackoff(() => chat.sendMessage(fullMessage));

        const response = await result.response;
        const text = response.text();

        if (!text) {
            throw new Error("Gemini returned empty response");
        }

        return text;
    } catch (error) {
        console.error("Error generating contract response:", error);
        throw error;
    }
}

/**
 * Extract invoice data from contract text using Gemini API
 * 契約書テキストから請求書データを抽出
 */
export async function extractInvoiceDataFromContract(
    contractText: string,
    apiKey: string
): Promise<{
    items: InvoiceItem[];
    payment_deadline?: string;
    amount?: number;
    is_recurring?: boolean;
    recurring_interval?: 'monthly' | 'quarterly' | 'yearly' | null;
}> {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
以下の契約書テキストから、請求書作成に必要な情報を抽出してJSON形式で返してください。

抽出項目:
1. items: 請求項目の配列。各項目には以下を含む:
   - description: 項目の説明（例: "システム開発費用", "月額利用料"）
   - quantity: 数量（通常は1）
   - unit: 単位（例: "式", "ヶ月", "件"）
   - unitPrice: 単価（税抜き）
   - taxRate: 消費税率（0, 8, または 10）

2. payment_deadline: 支払期日（例: "翌月末", "当月末", "翌月20日"）

3. amount: 請求金額の合計（税抜き）。複数項目がある場合は合計値。

4. is_recurring: 定期的な請求かどうか（true or false）

5. recurring_interval: 定期請求の場合の頻度（"monthly", "quarterly", "yearly"）。一時的な請求の場合はnull。

契約書テキスト:
\${contractText.substring(0, 15000)}

出力フォーマット（JSON形式のみ、Markdownコードブロックは不要）:
{
  "items": [
    {
      "description": "項目名",
      "quantity": 1,
      "unit": "式",
      "unitPrice": 100000,
      "taxRate": 10
    }
  ],
  "payment_deadline": "翌月末",
  "amount": 100000,
  "is_recurring": true,
  "recurring_interval": "monthly"
}

注意:
- 契約書に明記されていない情報は推測しないでください
- 金額が見つからない場合は null を返してください
- 請求項目が複数ある場合は、すべて items 配列に含めてください
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();
        console.log("Gemini Invoice Extraction Response:", textResponse);

        // Clean up the response to extract JSON
        let cleanJson = textResponse.replace(/```json\n?|\n?```/g, '').trim();
        const firstOpen = cleanJson.indexOf('{');
        const lastClose = cleanJson.lastIndexOf('}');

        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            cleanJson = cleanJson.substring(firstOpen, lastClose + 1);
            try {
                const parsed = JSON.parse(cleanJson);

                // Validate and normalize the data
                return {
                    items: Array.isArray(parsed.items) ? parsed.items : [],
                    payment_deadline: parsed.payment_deadline || undefined,
                    amount: typeof parsed.amount === 'number' ? parsed.amount : undefined,
                    is_recurring: typeof parsed.is_recurring === 'boolean' ? parsed.is_recurring : false,
                    recurring_interval: parsed.recurring_interval || null
                };
            } catch (e) {
                console.error("JSON Parse Error in invoice extraction:", e);
                return {
                    items: [],
                    is_recurring: false,
                    recurring_interval: null
                };
            }
        }

        return {
            items: [],
            is_recurring: false,
            recurring_interval: null
        };
    } catch (error) {
        console.error("Error extracting invoice data from contract:", error);
        throw error;
    }
}
