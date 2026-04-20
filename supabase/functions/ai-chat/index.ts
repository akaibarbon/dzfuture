// Edge function: Lovable AI Gateway proxy with multimodal + tool-style support
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT =
  "أنت مساعد ذكي للطلاب الجزائريين على منصة Future DZ. جاوب بالعربية الفصحى بشكل واضح، مفيد، وموجز. عند تحليل صور أو ملفات (PDF, TXT)، اشرح المحتوى وحلّ التمارين أو لخّصها حسب الطلب.";

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
      return {
        role: "user",
        content: `${m.content || "حلّل هذا الملف."}\n\nرابط الملف: ${m.file_url}`,
      };
    }
    return { role: m.role, content: m.content };
  });
}

function promptForType(type: string, p: any): string {
  const lang = p?.language === "fr" ? "بالفرنسية" : p?.language === "en" ? "بالإنجليزية" : "بالعربية";
  switch (type) {
    case "summarize":
      return `لخّص النص التالي ${lang} بشكل واضح وموجز:\n\n${p?.text || ""}`;
    case "explain":
      return `اشرح المفهوم التالي ${lang} للطالب الجزائري بطريقة بسيطة:\n\n${p?.topic || ""}`;
    case "quiz":
      return `أنشئ 5 أسئلة اختيار من متعدد ${lang} حول الموضوع: ${p?.topic || ""}`;
    case "translate":
      return `ترجم النص التالي إلى ${p?.target || "العربية"}:\n\n${p?.text || ""}`;
    case "summarize-subject":
      return `لخّص المادة "${p?.subject || ""}" ${lang} مع التركيز على المواضيع: ${p?.topics || ""}. قدّم ملخصاً منظماً بالعناوين الرئيسية والنقاط المهمة.`;
    case "generate-exam":
      return `أنشئ امتحاناً تجريبياً ${lang} في مادة ${p?.subject || ""} بمستوى صعوبة ${p?.difficulty || "متوسط"}. عدد الأسئلة: ${p?.count || 10}. المستوى الدراسي: ${p?.level || "ثانوي"}. قدّم الأسئلة مرقمة مع الإجابات في النهاية.`;
    case "suggest-tasks": {
      const subjects = p?.subjects || "";
      const existing = p?.existingTasks || "";
      return `أنت مخطط دراسي ذكي. اقترح 3 إلى 5 مهام دراسية واقعية لطالب جزائري. المواد المتاحة: ${subjects}. مهام الطالب الحالية (لا تكررها): ${existing}.\n\nأرجع JSON فقط بهذا الشكل (بدون أي شرح خارجه):\n[{"title":"...","date":"YYYY-MM-DD","time":"HH:MM","type":"exam|homework|revision|meeting|other"}]`;
    }
    case "moderate":
      return `قيّم الرسالة التالية. هل تحتوي على إهانات أو محتوى ضار أو غير لائق؟\n\nالرسالة: "${p?.message || ""}"\n\nأرجع JSON فقط: {"safe": true|false, "reason": "السبب باختصار إن لم تكن آمنة، أو فارغ"}`;
    case "group-bot":
      return `أنت بوت ذكي في مجموعة دراسة جزائرية اسمها "${p?.groupName || "المجموعة"}". أجب على السؤال التالي بشكل واضح وموجز ومفيد بالعربية:\n\n${p?.question || ""}`;
    case "knowledge-radar":
      return `أنت مدرّس خبير ومُشخّص ثغرات معرفية للطلاب الجزائريين. حلّل إجابة الطالب التالية في مادة ${p?.subject || ""} بمستوى ${p?.level || ""}.\n\nالسؤال:\n${p?.question || ""}\n\nإجابة الطالب:\n${p?.studentAnswer || ""}\n\nأرجع JSON فقط بهذا الشكل (بدون أي شرح خارجه):\n{\n  "mainError": "وصف موجز للخطأ المباشر في الإجابة",\n  "rootCause": "السبب الجذري الحقيقي للثغرة المعرفية",\n  "rootLevel": "السنة أو المستوى الذي يعود إليه السبب الجذري (مثلاً: السنة 4 متوسط)",\n  "capsule": "كبسولة مراجعة سريعة بصياغة Markdown تعالج السبب الجذري",\n  "correctedSolution": "الحل الصحيح خطوة بخطوة بصياغة Markdown"\n}`;
    case "voice":
      return `أنت "أمين"، مساعد صوتي للطلاب الجزائريين. أجب بالدارجة الجزائرية البسيطة بشكل قصير جداً (جملة أو جملتين فقط، لأن الرد سيُقرأ بصوت عالٍ). السؤال: ${p?.question || ""}`;
    default:
      return p?.prompt || "";
  }
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
      const prompt = promptForType(type, payload || {});
      if (!prompt) {
        return new Response(JSON.stringify({ error: `طلب غير معروف: ${type}` }), {
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
