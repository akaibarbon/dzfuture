import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export const chatStream = createServerFn({ method: "POST" })
  .inputValidator((input: { messages: Msg[] }) => {
    if (!input || !Array.isArray(input.messages)) throw new Error("messages required");
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "أنت مساعد ذكي للطلاب الجزائريين على منصة Future DZ. جاوب بالعربية بشكل مفيد، واضح، وموجز." },
          ...data.messages,
        ],
        stream: false,
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return { error: "تم تجاوز الحد المسموح. حاول لاحقاً." };
      if (resp.status === 402) return { error: "الرصيد منتهي. أضف رصيداً للاستمرار." };
      const txt = await resp.text();
      console.error("AI error:", resp.status, txt);
      return { error: "حدث خطأ في خدمة الذكاء الاصطناعي" };
    }

    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content || "";
    return { content };
  });

export const aiTool = createServerFn({ method: "POST" })
  .inputValidator((input: { type: string; payload: Record<string, any> }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { error: "LOVABLE_API_KEY not configured" };

    const prompts: Record<string, string> = {
      summarize: `لخّص النص التالي بشكل واضح وموجز:\n\n${data.payload.text || ""}`,
      explain: `اشرح المفهوم التالي للطالب الجزائري بطريقة بسيطة:\n\n${data.payload.topic || ""}`,
      quiz: `أنشئ 5 أسئلة اختيار من متعدد حول الموضوع: ${data.payload.topic || ""}`,
      translate: `ترجم النص التالي إلى ${data.payload.target || "العربية"}:\n\n${data.payload.text || ""}`,
    };

    const prompt = prompts[data.type] || data.payload.prompt || "";
    if (!prompt) return { error: "نوع غير معروف" };

    const resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return { error: "تم تجاوز الحد المسموح" };
      if (resp.status === 402) return { error: "الرصيد منتهي" };
      return { error: `خطأ ${resp.status}` };
    }

    const json = await resp.json();
    return { result: json.choices?.[0]?.message?.content || "" };
  });
