import { GoogleGenerativeAI } from "@google/generative-ai";

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
契約書の種類、当事者、条件などを丁寧にヒアリングし、日本の法律に準拠した契約書を作成してください。
専門用語は分かりやすく説明し、ユーザーが理解しやすいように配慮してください。`;

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

        const result = await chat.sendMessage(fullMessage);
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
