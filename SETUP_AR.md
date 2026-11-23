# NEXORA DIGITAL — دليل الإعداد والنشر (مجاني قدر الإمكان)

> لا تنشر الموقع القديم فوقه. أنشئ موقع Netlify جديداً للاختبار، ثم اربط دومين/رابط الإنتاج فقط بعد التأكد.

## ما الذي داخل المشروع؟
- `index.html` متجر RTL عربي، واجهة متجاوبة Dark Purple.
- `admin.html` لوحة إدارة خاصة.
- `assets/` ملفات CSS وJavaScript.
- `netlify/functions/api.mjs` API خادمي: تسجيل دخول، جلسة Cookie HttpOnly، إدارة منتجات وإعدادات.
- `supabase/schema.sql` مخطط قاعدة البيانات.
- `netlify.toml` إعداد Netlify.
- لوحة الإدارة: `/admin.html`.

## خطوات إعداد الخدمة (بدون دفع، حسب حدود الخطط المجانية الحالية)
1. **Supabase**: أنشئ مشروعاً جديداً على https://supabase.com (Free). افتح SQL Editor، انسخ كامل `supabase/schema.sql` ثم Run.
2. **إنشاء كلمة مرور للإدارة**: اختر Username وكلمة مرور قوية طويلة. لا تستخدم كلمة المرور نفسها لحساباتك الأخرى. توليد bcrypt hash يتم محلياً باستخدام Node بعد تنزيل المشروع:
   - ثبّت Node.js LTS من https://nodejs.org إن لم يكن موجوداً.
   - داخل مجلد المشروع افتح Terminal/CMD ونفّذ `npm install`.
   - نفّذ الأمر: `node -e "const b=require('bcryptjs'); b.hash(process.argv[1],12).then(console.log)" "YOUR_ADMIN_PASSWORD"` واستبدل كلمة المرور داخل علامات الاقتباس. انسخ الـhash الناتج فقط.
   - لا ترسل كلمة المرور أو hash في الدردشة ولا تضعها في ملفات الموقع.
3. **Netlify**: أنشئ موقعاً جديداً (Add new site / Import or deploy manually). ارفع المشروع عبر GitHub (موصى به) أو Netlify CLI. لا تربط هذا المشروع بالموقع الحالي.
4. **Environment variables** في Netlify Site configuration → Environment variables:
   - `SUPABASE_URL` = رابط مشروع Supabase (Project Settings → API).
   - `SUPABASE_SERVICE_ROLE_KEY` = Service role key من Supabase API settings. حساس جداً، لا تضفه في HTML/JS أو Git، ولا تشاركه. يستخدم فقط داخل Function.
   - `ADMIN_USERNAME` = اسم المستخدم الذي اخترته.
   - `ADMIN_PASSWORD_HASH` = bcrypt hash الذي أنشأته.
   - `SESSION_SECRET` = قيمة عشوائية طويلة 32+ حرفاً. يمكنك توليدها عبر Node: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
5. أعد نشر الموقع (Deploy) بعد وضع متغيرات البيئة. افتح رابط Netlify الجديد.
6. جرّب واجهة المتجر، تصنيف المنتجات، أزرار واتساب. ثم افتح `/admin.html` وسجّل الدخول. جرّب إضافة منتج وتعديله وإخفاءه وحذفه وإعدادات الصفحة ورقم واتساب. افتح المتجر في نافذة خاصة وتأكد أن التغييرات ظهرت.
7. **قبل الإنتاج**: احذف المنتج التجريبي/المخفي أو أضف منتجات فعلية تملك حق بيعها. لا تدرج اشتراكات أو بطاقات إلا إذا كان المزود يسمح بإعادة البيع والتوزيع. اختبر روابط الصور على الهاتف.

## النشر عبر Netlify CLI (بديل)
- `npm install`
- `npm install -g netlify-cli`
- `netlify login`
- `netlify deploy` (اختبار/Preview)
- اختبر رابط Preview.
- للنشر production: `netlify deploy --prod` بعد موافقتك.

## حماية وأمور يجب معرفتها
- كلمات المرور لا تمر إلا لFunction server-side ويتم التحقق باستخدام bcrypt.
- جلسة Cookie: HttpOnly, Secure, SameSite=Strict، مدتها 8 ساعات؛ التوقيع HMAC.
- قاعدة البيانات لا تسمح للanon/authenticated بقراءة أو تعديل عبر RLS. الوصول عبر Service Role داخل function فقط.
- API لا يرسل مفاتيح Supabase إلى المتصفح.
- **تنبيه**: هذه نسخة أساس آمنة نسبياً لمتجر صغير، وليست مراجعة أمنية احترافية. قبل نشرها علناً، أضف rate limiting/WAF (Netlify حسب إمكانات الخطة)، راقب سجلات الدخول، واحتفظ بنسخة احتياطية من SQL. حدّث bcrypt hash وSESSION_SECRET عند الحاجة.
- واجهة الصور تعتمد روابط خارجية، لا يوجد رفع صور إلى Storage ضمن هذه النسخة. ارفع الصور إلى خدمة موثوقة/Storage وأدخل URL عام.
- لا يوجد دفع إلكتروني في هذا الإصدار. الطلبات فقط عبر WhatsApp، ولا تؤكد الطلب حتى تتحقق من التوفر وحقوق البيع.
- لا تُعدّل أو تستبدل موقع Netlify الحالي قبل تجربة النسخة الجديدة ومراجعتها.

## مشاكل شائعة
- خطأ إعداد قاعدة البيانات: راجع URL وService Role key وتأكد من تطبيق SQL.
- خطأ تسجيل الدخول: تأكد من Username وbcrypt hash؛ لا تلصق hash في ملفات JS.
- لا تظهر المنتجات: تحقق من function logs في Netlify ومن إعدادات Supabase.
- رقم واتساب: يجب أن يكون أرقاماً فقط مع رمز الدولة، مثلاً `213...` دون + أو مسافات.
