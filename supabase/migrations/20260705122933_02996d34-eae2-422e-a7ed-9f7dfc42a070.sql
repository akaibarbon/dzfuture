
-- 1) TABLE
CREATE TABLE public.teach_technics_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('tip','method','tool','research','video','site')),
  title TEXT NOT NULL,
  subtitle TEXT,
  url TEXT,
  logo_url TEXT,
  category TEXT,
  level TEXT,
  is_free BOOLEAN,
  tags TEXT[] NOT NULL DEFAULT '{}',
  body TEXT,
  features TEXT[] NOT NULL DEFAULT '{}',
  how_to TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','pending_review','published')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tt_items_kind_status ON public.teach_technics_items(kind, status, sort_order);

-- 2) GRANTS
GRANT SELECT ON public.teach_technics_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teach_technics_items TO authenticated;
GRANT ALL ON public.teach_technics_items TO service_role;

-- 3) RLS
ALTER TABLE public.teach_technics_items ENABLE ROW LEVEL SECURITY;

-- Public read of published items (anon + authenticated)
CREATE POLICY "tt_read_published" ON public.teach_technics_items
  FOR SELECT USING (status = 'published');

-- Admins can read everything
CREATE POLICY "tt_admin_read_all" ON public.teach_technics_items
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Tutors can read their own non-published items (drafts, pending)
CREATE POLICY "tt_tutor_read_own" ON public.teach_technics_items
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() AND public.user_has_role(auth.uid(), 'tutor'));

-- Admin: full write
CREATE POLICY "tt_admin_insert" ON public.teach_technics_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "tt_admin_update" ON public.teach_technics_items
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "tt_admin_delete" ON public.teach_technics_items
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Tutor: can propose new items but ONLY as pending_review, must set created_by = self
CREATE POLICY "tt_tutor_propose" ON public.teach_technics_items
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_role(auth.uid(), 'tutor')
    AND created_by = auth.uid()
    AND status = 'pending_review'
  );

-- Tutor: can update own items while not yet published, cannot self-publish
CREATE POLICY "tt_tutor_update_own" ON public.teach_technics_items
  FOR UPDATE TO authenticated
  USING (
    public.user_has_role(auth.uid(), 'tutor')
    AND created_by = auth.uid()
    AND status <> 'published'
  )
  WITH CHECK (
    created_by = auth.uid()
    AND status IN ('draft','pending_review')
  );

-- 4) TRIGGER updated_at
CREATE TRIGGER tt_items_touch_updated_at
  BEFORE UPDATE ON public.teach_technics_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5) SEED existing content
-- Quick tips (4)
INSERT INTO public.teach_technics_items (kind, title, body, sort_order) VALUES
  ('tip','ابدأ صغيرًا','اختر أداة واحدة فقط هذا الأسبوع (مثلاً Gamma) وطبّقها في حصّة واحدة.',1),
  ('tip','برومبت واضح','اذكر المستوى + المادة + الهدف + عدد الدقائق. النتيجة تتضاعف جودتها.',2),
  ('tip','راجع دائمًا','AI يخطئ. راجع كل مخرج قبل تقديمه للتلاميذ، خاصة الأرقام والمراجع.',3),
  ('tip','علّم النقد','شارك التلاميذ كيف تستخدمها لتنمّي عندهم التفكير النقدي لا الاعتماد الأعمى.',4);

-- Methods (6)
INSERT INTO public.teach_technics_items (kind, title, subtitle, body, sort_order) VALUES
  ('method','Phenomenon-Based Learning','🇫🇮 فنلندا','بدل تدريس المواد منفصلة، ادرس ظاهرة كاملة (مثل تغيّر المناخ) من زوايا العلوم والرياضيات واللغة معًا. يحقّق تعلّمًا عميقًا ومترابطًا.',1),
  ('method','نموذج CPA (Concrete–Pictorial–Abstract)','🇸🇬 سنغافورة','ابدأ بأشياء ملموسة، ثم صور ورسومات، وأخيرًا رموز مجرّدة. الأداة المثالية: اطلب من Gemini توليد أنشطة CPA لأي مفهوم رياضي.',2),
  ('method','Spaced Repetition + AI','🇰🇷 كوريا الجنوبية','التكرار المتباعد يزيد التذكّر 200٪. استخدم Quizlet AI أو NotebookLM لتوليد بطاقات مراجعة تلقائيًا من دروسك.',3),
  ('method','Flipped Classroom','🇨🇦 كندا','الشرح في البيت عبر فيديو قصير (Loom + AI subtitles)، والحصّة للتطبيق والنقاش. AI يوفّر عليك ساعات في تحضير الفيديوهات.',4),
  ('method','Kaizen التربوي','🇯🇵 اليابان','تحسين مستمرّ بخطوات صغيرة. بعد كل حصّة اطلب من ChatGPT تحليل ملاحظات التلاميذ واقتراح تعديل واحد لتجربته الحصّة القادمة.',5),
  ('method','Universal Design for Learning (UDL)','🇺🇸 الولايات المتحدة','قدّم المحتوى بأشكال متعددة (نص + صوت + فيديو + تفاعل). ElevenLabs وSuno يجعلانك تنتج نسخًا مختلفة من نفس الدرس في دقائق.',6);

-- Tools (10)
INSERT INTO public.teach_technics_items (kind, title, subtitle, url, logo_url, category, level, is_free, tags, features, how_to, sort_order) VALUES
  ('tool','Google Gemini','مساعد ذكي متعدد الوسائط من Google','https://gemini.google.com','https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg','writing','مبتدئ',true,
    ARRAY['Google','متعدد الوسائط','سياق طويل','Docs','خطة درس'],
    ARRAY['يفهم النص والصور والصوت في نفس المحادثة','سياق طويل جدًا (حتى مليون رمز) لتحليل ملفات ودروس كاملة','تكامل مباشر مع Docs و Gmail و Drive للأساتذة'],
    ARRAY['افتح gemini.google.com وسجّل بحسابك المهني','ألصق نص الدرس واطلب: «حوّله إلى خطة درس 45 دقيقة بأهداف بيداغوجية»','ارفع صورة تمرين وأطلب حلولاً متدرّجة الصعوبة لتلاميذك'],1),

  ('tool','Gamma','توليد عروض تقديمية احترافية بضغطة زر','https://gamma.app','https://cdn.gamma.app/favicon-32x32.png','visual','مبتدئ',true,
    ARRAY['عروض','شرائح','تصميم','PPT','قوالب'],
    ARRAY['يحوّل موضوعًا نصّيًا إلى عرض كامل بالتصميم والصور','قوالب تعليمية جاهزة (درس، مراجعة، محاضرة)','تصدير PDF / PPT / موقع ويب مباشر'],
    ARRAY['اكتب: «عرض عن التحولات الكيميائية للسنة الرابعة متوسط، 10 شرائح»','عدّل النبرة (رسمي / تفاعلي) وأضف صور تلقائية','شارك الرابط مع القسم أو صدّره كملف عرض'],2),

  ('tool','NotebookLM','مختبر بحثي شخصي مبني على مصادرك أنت','https://notebooklm.google.com','https://notebooklm.google.com/_/static/branding/v3/notebooklm_logo_32.png','research','متوسط',true,
    ARRAY['Google','PDF','بحث','بودكاست','ملخصات','تقييم'],
    ARRAY['ارفع 50 مصدر PDF/رابط/نص واسأل عنها كأنها كتاب واحد','يولّد ملخصات، أسئلة، خرائط ذهنية من مصادرك','ميزة Audio Overview: يحوّل الدرس إلى بودكاست حواري'],
    ARRAY['أنشئ Notebook جديد وارفع دروس الفصل PDF','اطلب: «ولّد 20 سؤال تقييم متدرّج مع الإجابات النموذجية»','شغّل «Audio Overview» ليستمع التلاميذ للدرس في الطريق'],3),

  ('tool','ChatGPT','أشهر مساعد كتابي عام الاستخدام','https://chat.openai.com','https://cdn.oaistatic.com/assets/favicon-eex17e3i.svg','writing','مبتدئ',true,
    ARRAY['OpenAI','شرح','تمارين','Canvas','Custom GPT'],
    ARRAY['يشرح المفاهيم بمستويات مختلفة (طفل / مراهق / متخصص)','توليد تمارين، رومان تعليمية، سيناريوهات محاكاة','وضع Canvas لتحرير الوثائق تعاونيًا'],
    ARRAY['اطلب: «اشرح نظرية طاليس بثلاث طرق مختلفة لتلميذ ضعيف»','استخدم Custom GPT لبناء مساعد متخصص لمادتك','ولّد فرضًا محروسًا بمستوى صعوبة تحدّده أنت'],4),

  ('tool','Claude','الأفضل في تحليل النصوص الطويلة والتصحيح','https://claude.ai','https://claude.ai/favicon.ico','writing','متقدم',true,
    ARRAY['Anthropic','تصحيح','سياق طويل','Artifacts','تحليل نصوص'],
    ARRAY['نافذة سياق ضخمة (200K رمز) — يقرأ كتاب كامل','دقّة عالية في تصحيح الفروض المكتوبة يدويًا (بعد OCR)','Artifacts: يولّد صفحات HTML تفاعلية للدروس'],
    ARRAY['الصق 30 صفحة من محتوى وحدة واطلب مراجعة شاملة','استخدمه لتصحيح الإنشاءات مع تعليقات بيداغوجية','اطلب أداة تفاعلية (Artifact) لشرح مفهوم صعب'],5),

  ('tool','Perplexity','محرك بحث AI بمصادر موثّقة','https://perplexity.ai','https://www.perplexity.ai/favicon.ico','research','مبتدئ',true,
    ARRAY['بحث','مصادر','أكاديمي','YouTube','Collections'],
    ARRAY['كل إجابة تأتي مع روابط المصادر الأصلية','وضع Academic للأبحاث العلمية المحكّمة','Focus mode للبحث في YouTube أو Reddit أو أوراق أكاديمية'],
    ARRAY['اسأل: «آخر الطرق البيداغوجية في تعليم الرياضيات 2025»','فعّل Academic mode لتحضير درس علمي دقيق','احفظ Collections لكل مادة تدرّسها'],6),

  ('tool','Suno AI','توليد أغاني تعليمية جذّابة','https://suno.com','https://suno.com/favicon.ico','audio','مبتدئ',true,
    ARRAY['موسيقى','أغاني','حفظ','عربي','إبداع'],
    ARRAY['يحوّل قاعدة نحوية أو تاريخًا إلى أغنية يحفظها التلميذ بسهولة','يدعم العربية والفرنسية والإنجليزية','تحكّم في الأسلوب (راب / بوب / كلاسيكي)'],
    ARRAY['اكتب كلمات تلخّص القاعدة، اختر النمط، اضغط Create','شغّل الأغنية في بداية الحصة كمدخل مشوّق','اطلب من التلاميذ كتابة أغنية عن الدرس كمشروع'],7),

  ('tool','ElevenLabs','أصوات بشرية طبيعية بلغات متعددة','https://elevenlabs.io','https://elevenlabs.io/favicon.ico','audio','متوسط',false,
    ARRAY['صوت','TTS','دبلجة','استنساخ صوت','MP3'],
    ARRAY['أصوات عربية فصيحة وواقعية جدًا','استنساخ صوت (Voice Clone) لتسجيل دروسك بصوتك دون جهد','دبلجة تلقائية للفيديوهات'],
    ARRAY['ألصق الدرس، اختر صوتًا عربيًا، حمّل ملف MP3','أرسله للتلاميذ كنسخة صوتية للمراجعة أثناء التنقّل','استعمله لمساعدة التلاميذ ذوي صعوبات القراءة'],8),

  ('tool','Canva Magic Studio','تصميم بصري بمساعدة الذكاء الاصطناعي','https://canva.com','https://static.canva.com/static/images/favicon.ico','visual','مبتدئ',true,
    ARRAY['تصميم','ملصقات','قوالب','Magic Write','تعاون'],
    ARRAY['Magic Design: يولّد ملصقات ومخططات من وصف نصّي','Magic Write لكتابة محتوى تعليمي داخل التصميم','قوالب تعليمية مجانية لأولياء الأمور والتلاميذ'],
    ARRAY['اكتب: «ملصق عن دورة الماء بألوان مبهجة»','استعمل Magic Switch لتحويل نفس المحتوى إلى Story أو منشور','شارك رابط تحرير مع التلاميذ لعمل جماعي'],9),

  ('tool','Khanmigo','مساعد Khan Academy للأساتذة والتلاميذ','https://khanacademy.org/khan-labs','https://cdn.kastatic.org/images/favicon.ico','classroom','متوسط',true,
    ARRAY['Khan Academy','سقراطي','خطة درس','تقييم','تلاميذ'],
    ARRAY['لا يعطي الإجابة مباشرة بل يوجّه التلميذ سقراطيًا','أدوات جاهزة: بناء اختبار، خطة درس، تقرير تلميذ','مجاني للأساتذة عبر برنامج Khan Academy Districts'],
    ARRAY['سجّل كأستاذ عبر khanmigo.ai','استخدم أداة «Lesson Plan» لإنتاج خطة حصة بدقائق','أعطِ التلاميذ حسابات ليحلّوا التمارين بمساعدة سقراطية'],10);

-- Research (4)
INSERT INTO public.teach_technics_items (kind, title, subtitle, url, sort_order) VALUES
  ('research','UNESCO — AI and Education Guidance for Policymakers','اليونسكو، 2023','https://unesdoc.unesco.org/ark:/48223/pf0000376709',1),
  ('research','OECD — Opportunities, Guidelines and Guardrails for Effective AI in Education','OECD، 2024','https://www.oecd.org/en/publications/opportunities-guidelines-and-guardrails-for-effective-and-equitable-use-of-ai-in-education_a8ff2f80-en.html',2),
  ('research','MIT — Generative AI in the Classroom','MIT Teaching Systems Lab','https://tsl.mit.edu',3),
  ('research','Harvard — Teaching with AI: A Guide for Educators','Harvard Graduate School of Education','https://www.gse.harvard.edu/ideas/usable-knowledge/23/07/embracing-artificial-intelligence-classroom',4);

-- Videos (3)
INSERT INTO public.teach_technics_items (kind, title, subtitle, url, sort_order) VALUES
  ('video','How AI Could Save (Not Destroy) Education — Sal Khan','TED','https://www.youtube.com/watch?v=hJP5GqnTrNo',1),
  ('video','Teachers Using AI: Real Classroom Examples','Common Sense Education','https://www.youtube.com/watch?v=SsC3XiWMlDA',2),
  ('video','The Future of Learning with Gemini','Google for Education','https://www.youtube.com/@GoogleForEducation',3);

-- Sites (4)
INSERT INTO public.teach_technics_items (kind, title, subtitle, url, sort_order) VALUES
  ('site','AI for Education',NULL,'https://www.aiforeducation.io',1),
  ('site','Edutopia',NULL,'https://www.edutopia.org',2),
  ('site','Common Sense — AI Ratings',NULL,'https://www.commonsense.org/education/ai',3),
  ('site','TeachAI',NULL,'https://www.teachai.org',4);

UPDATE public.teach_technics_items SET body = 'دورات مجانية للأساتذة حول توظيف AI في الفصل.' WHERE kind='site' AND title='AI for Education';
UPDATE public.teach_technics_items SET body = 'مقالات وأبحاث في أساليب التدريس المبتكرة.' WHERE kind='site' AND title='Edutopia';
UPDATE public.teach_technics_items SET body = 'تقييم مستقل لأدوات AI التعليمية.' WHERE kind='site' AND title='Common Sense — AI Ratings';
UPDATE public.teach_technics_items SET body = 'مبادرة عالمية تجمع سياسات ومناهج AI للمدارس.' WHERE kind='site' AND title='TeachAI';
