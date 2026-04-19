// Edge function: Lovable AI Gateway proxy with file (image/PDF/TXT) support
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT =
  "أنت مساعد ذكي للطلاب الجزائريين على منصة Future DZ. جاوب بالعربية بشكل واضح، مفيد، وموجز. عند تحليل صور أو ملفات (PDF, TXT)، اشرح المحتوى وحلّ التمارين أو لخّصها حسب الطلب.";

type IncomingMsg = {
  role: "user" | "assistant" | "system";
  content: string;
  file_url?: string | null;
  file_type?: string | null;
};

function buildMessages(messages: IncomingMsg[]) {
  return messages.map((m) => {
    if (m.role === "user" && m.file_url) {
      const ft = (m.file_type || "").toLowerCase();
      const isImage = ft.startsWith("image") || /\.(png|jpg|jpeg|webp|gif)$/i.test(m.file_url);
      if (isImage) {
        return {
          role: "user",
          content: [
            { type: "text", text: m.content || "حلّل هذه الصورة." },
            { type: "image_url", image_url: { url: m.file_url } },
          ],
        };
      }
      // PDF / TXT / DOCX → reference URL in text (model will fetch context from filename + user instruction)
      return {
        role: "user",
        content: `${m.content || "حلّل هذا الملف."}\n\nرابط الملف: ${m.file_url}`,
      };
    }
    return { role: m.role, content: m.content };
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, type, payload } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let chatMessages: any[] = [];

    if (type) {
      // Tool-style single-turn invocation
      const prompts: Record<string, string> = {
        summarize: `لخّص النص التالي بشكل واضح وموجز:\n\n${payload?.text || ""}`,
        explain: `اشرح المفهوم التالي للطالب الجزائري بطريقة بسيطة:\n\n${payload?.topic || ""}`,
        quiz: `أنشئ 5 أسئلة اختيار من متعدد حول الموضوع: ${payload?.topic || ""}`,
        translate: `ترجم النص التالي إلى ${payload?.target || "العربية"}:\n\n${payload?.text || ""}`,
      };
      const prompt = prompts[type] || payload?.prompt || "";
      if (!prompt) {
        return new Response(JSON.stringify({ error: "نوع غير معروف" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      chatMessages = [{ role: "user", content: prompt }];
    } else if (Array.isArray(messages)) {
      chatMessages = buildMessages(messages);
    } else {
      return new Response(JSON.stringify({ error: "messages or type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...chatMessages],
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("AI gateway error:", resp.status, txt);
      if (resp.status === 429)
        return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح. حاول لاحقاً." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (resp.status === 402)
        return new Response(JSON.stringify({ error: "الرصيد منتهي. أضف رصيداً للاستمرار." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      return new Response(JSON.stringify({ error: `خطأ في خدمة الذكاء الاصطناعي (${resp.status})` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ content, result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
