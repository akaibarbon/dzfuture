## الهدف
تحويل محتوى صفحة **Teach Technics** من قوائم ثابتة في الكود إلى محتوى مُدار من قاعدة البيانات، مع لوحة تحكم خاصة بالمسؤول (admin) لإضافة/تعديل/حذف/مراجعة كل عنصر، وبقاء الصفحة العامة تعرض المحتوى المنشور فقط.

## قاعدة البيانات
جدول واحد موحّد `teach_technics_items` (بسيط ومرن):
- `kind` — نوع العنصر: `tip` | `method` | `tool` | `research` | `video` | `site`
- `title` — العنوان (اسم الأداة، عنوان الطريقة، إلخ)
- `subtitle` — سطر توضيحي (tagline، البلد، القناة، المنظمة…)
- `url` — رابط خارجي (اختياري: للنصائح لا يوجد)
- `logo_url` — شعار (للأدوات فقط، تلقائي fallback لـ Clearbit)
- `category` — تصنيف داخلي (writing/visual/audio/research/classroom للأدوات؛ فارغ للباقي)
- `level` — مبتدئ/متوسط/متقدم (للأدوات فقط)
- `is_free` — true/false (للأدوات فقط)
- `tags` — قائمة وسوم نصية
- `body` — الشرح الطويل / body للنصائح والطرق
- `features` — قائمة نصية (للأدوات)
- `how_to` — قائمة خطوات (للأدوات)
- `status` — `draft` | `pending_review` | `published` (يدعم سير المراجعة)
- `sort_order` — ترتيب يدوي داخل نفس النوع
- `created_by` — من أنشأ العنصر

**سياسات الوصول (RLS):**
- الجميع (بما فيهم الزوّار): قراءة العناصر ذات `status='published'` فقط.
- المسؤول (admin): قراءة/إنشاء/تعديل/حذف كل شيء.
- الأستاذ (tutor): يقدر يقترح عناصر جديدة بحالة `pending_review`، ويعدّل ما أنشأه هو فقط ما دام غير منشور.
- المنح (GRANT): `SELECT` لـ anon و authenticated، `INSERT/UPDATE/DELETE` لـ authenticated.

**البذر (seed):** ترحيل القوائم الحالية (10 أدوات + 4 نصائح + 6 طرق + 4 أبحاث + 3 فيديوهات + 4 مواقع) إلى الجدول بحالة `published` مع `sort_order` مطابق للترتيب الحالي، حتى لا تفرغ الصفحة.

## Server functions
ملف `src/lib/teach-technics.functions.ts`:
- `listTeachTechnicsPublic({ kind? })` — قراءة عامة للمنشور فقط (بدون مصادقة، تستخدم مفتاح publishable).
- `listTeachTechnicsAdmin({ kind?, status? })` — للمسؤول: كل الحالات مع فلاتر.
- `upsertTeachTechnicsItem(item)` — إنشاء/تعديل (مسموح للمسؤول لأي شيء، للأستاذ لعناصره غير المنشورة).
- `deleteTeachTechnicsItem({ id })` — حذف (مسؤول فقط).
- `reviewTeachTechnicsItem({ id, action })` — `action`: `approve` (→published) / `reject` (→draft) / `request_review` — مسؤول فقط.
- `reorderTeachTechnicsItems({ kind, orderedIds })` — تحديث `sort_order` جماعيًا.

كل الدوال المحمية تستخدم `requireSupabaseAuth` وتتحقق من الدور عبر `is_admin`.

## واجهة المسؤول
- مسار جديد: `src/pages/admin-teach-technics.tsx` (تحت `_authenticated`).
- تُدرج في **Control Panel** (`control-panel.tsx`) كبطاقة "إدارة Teach Technics" تظهر للمسؤول فقط.
- تبويبات (Tabs) لكل نوع محتوى: نصائح • طرق • أدوات • أبحاث • فيديوهات • مواقع • قيد المراجعة.
- كل تبويب:
  - جدول/بطاقات بالعناصر الحالية مع شارات الحالة (draft/pending/published) وأزرار: تعديل • حذف • نشر/إلغاء نشر • أعلى/أسفل (ترتيب).
  - زر "إضافة عنصر" يفتح Dialog بنموذج مناسب لنوع العنصر (الحقول تظهر ديناميكيًا حسب `kind`).
- تبويب **قيد المراجعة**: يجمع كل ما اقترحه الأساتذة بحالة `pending_review`، مع أزرار قبول/رفض.
- بحث مباشر داخل كل تبويب (بالعنوان والوسوم).

## تحديث صفحة Teach Technics العامة
- تحميل البيانات من `listTeachTechnicsPublic()` عبر TanStack Query (`useSuspenseQuery` + `queryOptions` في الـ loader).
- إسقاط القوائم الثابتة `AI_TOOLS/QUICK_TIPS/…` (نُبقيها كـ fallback لدقيقة واحدة إن فشل الاستعلام).
- بقية الميزات (البحث، الوسوم، السعر، الترتيب، المفضّلات) تعمل كما هي على البيانات القادمة من DB.

## اقتراح الأستاذ
زر صغير في صفحة Teach Technics: "اقترح أداة/طريقة" (للأساتذة فقط) يفتح نفس نموذج الإضافة لكن يُرسل `status='pending_review'` مباشرة، ويظهر في تبويب المراجعة عند المسؤول.

## ملفات ستُنشأ / تُعدَّل

**جديدة:**
- migration واحد ينشئ الجدول + السياسات + GRANTs + trigger `updated_at` + seed للمحتوى الحالي.
- `src/lib/teach-technics.functions.ts` — كل الـ server functions.
- `src/pages/admin-teach-technics.tsx` — لوحة الإدارة (Tabs + نماذج).
- `src/components/teach-technics-item-form.tsx` — نموذج ديناميكي حسب النوع.

**معدّلة:**
- `src/pages/teach-technics.tsx` — قراءة من DB + زر "اقترح" للأساتذة.
- `src/pages/control-panel.tsx` — إضافة رابط لوحة إدارة Teach Technics.
- `src/App.tsx` — تسجيل المسار الجديد.

## تفاصيل تقنية مختصرة
- الحقول القائمة (features/how_to/tags): `text[]` في Postgres، وإدخال نصي multi-line في الواجهة (سطر لكل عنصر).
- الترتيب: `sort_order integer default 0` مع `ORDER BY sort_order, created_at`.
- الحالة الافتراضية للمسؤول عند الإضافة: `published`. للأستاذ: `pending_review` (مفروض في الـ handler).
- لا نغيّر التصميم الحالي لصفحة Teach Technics، فقط مصدر البيانات.
