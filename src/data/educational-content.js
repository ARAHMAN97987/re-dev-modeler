// Extracted from App.jsx lines 6344-8559
// Educational content registry: keyed by section ID.

export const EDUCATIONAL_CONTENT = {
  financingMode: {
    ar: {
      title: "آليات التمويل العقاري",
      intro: "اختيار آلية التمويل يحدد هيكل الصفقة، الأطراف المشاركة، التكاليف، والعوائد. كل آلية لها متطلبات وتأثيرات مختلفة على المشروع.",
      cta: "فهمت",
      tabs: [
        {
          id: "self",
          label: "تمويل ذاتي",
          icon: "💰",
          content: [
            { type: "heading", text: "ما هو التمويل الذاتي؟" },
            { type: "text", text: "يقوم المطور بتمويل المشروع بالكامل من أمواله الخاصة بدون أي تمويل بنكي أو مستثمرين خارجيين." },
            { type: "heading", text: "متى يُستخدم؟" },
            { type: "list", items: [
              "المشاريع الصغيرة والمتوسطة التي لا تحتاج رأس مال ضخم",
              "عندما يكون لدى المطور سيولة كافية ولا يريد تحمّل تكاليف تمويل",
              "مشاريع تطوير الأراضي أو البنية التحتية قصيرة المدة",
              "عندما تكون شروط البنوك غير مناسبة أو التمويل غير متاح"
            ]},
            { type: "heading", text: "التأثير على هيكل الصفقة" },
            { type: "text", text: "أبسط هيكل ممكن: لا يوجد أقساط بنكية، ولا التزامات لمستثمرين، ولا رسوم هيكلة أو إدارة صناديق. المطور يملك المشروع 100% ويتحمل المخاطرة كاملة." },
            { type: "heading", text: "المزايا" },
            { type: "list", items: [
              "تحكم كامل بالقرارات بدون شروط مقرضين أو مستثمرين",
              "لا توجد تكاليف تمويل (فوائد، رسوم بنكية، رسوم صندوق)",
              "سرعة في التنفيذ بدون إجراءات موافقات بنكية",
              "كل الأرباح للمطور بدون مشاركة"
            ]},
            { type: "heading", text: "المخاطر والملاحظات" },
            { type: "list", items: [
              "يتطلب سيولة عالية قد تكون محجوزة لفترة طويلة",
              "يحد من القدرة على تنفيذ مشاريع متعددة في نفس الوقت",
              "لا يستفيد من الرافعة المالية (Leverage) التي ترفع العائد على رأس المال",
              "المخاطرة الكاملة على المطور وحده"
            ]}
          ]
        },
        {
          id: "bank100",
          label: "بنكي 100%",
          icon: "🏦",
          content: [
            { type: "heading", text: "ما هو التمويل البنكي 100%؟" },
            { type: "text", text: "البنك يموّل كامل تكلفة المشروع (100% LTV). المطور يملك المشروع لكن بدون مساهمة نقدية مباشرة - الاعتماد الكامل على التمويل البنكي." },
            { type: "heading", text: "متى يُستخدم؟" },
            { type: "list", items: [
              "عندما يملك المطور أصولاً كبيرة كضمانات لكن سيولته محدودة",
              "مشاريع مدعومة حكومياً أو ضمن برامج تمويل ميسّرة",
              "عندما يكون للمطور سجل ائتماني قوي وعلاقة قوية مع البنك",
              "مشاريع ذات تدفقات نقدية مضمونة (عقود إيجار مسبقة)"
            ]},
            { type: "heading", text: "المتطلبات الأساسية" },
            { type: "list", items: [
              "ضمانات عينية (رهن عقاري) أو ضمانات شخصية/كفالات",
              "تقييم ائتماني وتصنيف مقبول من البنك",
              "دراسة جدوى مفصلة ونموذج مالي معتمد",
              "نسبة تغطية خدمة الدين (DSCR) مقبولة للبنك",
              "قد يشترط البنك حساب ضمان (Escrow) للتدفقات النقدية"
            ]},
            { type: "heading", text: "التكاليف المتوقعة" },
            { type: "list", items: [
              "معدل ربح/فائدة سنوي (في السعودية عادة SAIBOR + هامش)",
              "رسوم ترتيب القرض (Upfront Fee) - عادة 0.5% إلى 2%",
              "رسوم تقييم والتزام ورسوم قانونية",
              "تكلفة التأمين المطلوب من البنك"
            ]},
            { type: "heading", text: "المخاطر والملاحظات" },
            { type: "list", items: [
              "أعلى مستوى مديونية - أي تأخير بالإيرادات يضغط على DSCR",
              "شروط البنك قد تكون مقيّدة (قيود على التوزيعات، تعهدات مالية)",
              "البنك قد يطلب حق الموافقة على قرارات رئيسية",
              "في حال تعثر المشروع، البنك يأخذ الأولوية في الاسترداد",
              "نادر في السوق السعودي بدون أي مساهمة من المطور"
            ]}
          ]
        },
        {
          id: "debt",
          label: "دين + ملكية",
          icon: "🏗",
          content: [
            { type: "heading", text: "ما هو نموذج الدين + الملكية؟" },
            { type: "text", text: "الهيكل الأكثر شيوعاً في التطوير العقاري: جزء من التمويل يأتي من البنك (قرض) والباقي من رأس مال المطور (Equity). نسبة التمويل البنكي (LTV) عادة 50% إلى 70% في السوق السعودي." },
            { type: "heading", text: "متى يُستخدم؟" },
            { type: "list", items: [
              "معظم مشاريع التطوير العقاري المتوسطة والكبيرة",
              "عندما يريد المطور الاستفادة من الرافعة المالية لرفع العائد",
              "مشاريع ذات دراسة جدوى قوية ومقبولة بنكياً",
              "التطوير السكني والتجاري والمختلط"
            ]},
            { type: "heading", text: "كيف يعمل الهيكل؟" },
            { type: "list", items: [
              "المطور يساهم برأس المال أولاً (عادة 30% - 50%)",
              "البنك يسحب القرض تدريجياً مع تقدم البناء",
              "فترة سماح أثناء البناء (الفائدة تتراكم بدون أقساط)",
              "بعد الانتهاء تبدأ أقساط السداد من إيرادات المشروع",
              "المطور يملك المشروع بالكامل بعد سداد القرض"
            ]},
            { type: "heading", text: "التكاليف والأثر المالي" },
            { type: "list", items: [
              "تكلفة التمويل (فائدة + رسوم) تقلل صافي العائد",
              "لكن الرافعة المالية ترفع العائد على رأس المال (ROE)",
              "كلما زادت نسبة الدين زاد العائد والمخاطرة معاً",
              "DSCR هو المؤشر الأهم - يجب أن يبقى فوق 1.2x عادة"
            ]},
            { type: "heading", text: "ملاحظات مهمة" },
            { type: "list", items: [
              "البنك يشترط ضمانات وتعهدات مالية (Covenants)",
              "في التمويل الإسلامي: يكون عبر عقد مرابحة أو إجارة",
              "رأس مال المطور يجب أن يُضخ أولاً قبل سحب القرض",
              "توزيعات الأرباح قد تكون مقيدة حتى يصل DSCR لمستوى معين"
            ]}
          ]
        },
        {
          id: "fund",
          label: "صندوق (GP/LP)",
          icon: "📊",
          content: [
            { type: "heading", text: "ما هو الصندوق الاستثماري (GP/LP)؟" },
            { type: "text", text: "هيكل استثماري يجمع رأس المال من مستثمرين متعددين (LP - شركاء محدودون) ويديره المطور أو مدير استثمار (GP - الشريك العام). يُستخدم للمشاريع الكبيرة التي تحتاج رؤوس أموال تتجاوز قدرة مطور واحد." },
            { type: "heading", text: "متى يُستخدم؟" },
            { type: "list", items: [
              "المشاريع الكبيرة (عادة أكثر من 100 مليون ريال)",
              "عندما يحتاج المطور رأس مال أكبر من قدرته الذاتية",
              "لجذب مستثمرين مؤسسيين (صناديق سيادية، شركات تأمين، أوقاف)",
              "مشاريع التطوير والاحتفاظ طويلة المدة (Develop & Hold)"
            ]},
            { type: "heading", text: "الأطراف المطلوبة" },
            { type: "list", items: [
              "GP (الشريك العام): المطور أو مدير الاستثمار - يدير المشروع",
              "LP (الشركاء المحدودون): المستثمرون - يساهمون برأس المال",
              "مدير الصندوق: قد يكون GP نفسه أو جهة مالية مرخصة (CMA)",
              "أمين حفظ (Custodian): يحفظ أصول الصندوق - مطلوب نظامياً",
              "مدقق حسابات: تدقيق سنوي إلزامي",
              "مستشار قانوني: لصياغة وثائق الصندوق والاتفاقيات"
            ]},
            { type: "heading", text: "الرسوم والتكاليف" },
            { type: "list", items: [
              "رسوم هيكلة (Structuring Fee): 1% - 3% مرة واحدة لتأسيس الصندوق",
              "رسوم اشتراك (Subscription Fee): 1% - 2% عند دخول المستثمر",
              "رسوم إدارة سنوية (Management Fee): 1% - 2.5% من صافي الأصول",
              "رسوم أمين الحفظ: 0.05% - 0.15% سنوياً",
              "رسوم تطوير (Developer Fee): 3% - 8% من تكلفة البناء",
              "رسوم ما قبل التأسيس: مصاريف دراسات وتقديم لهيئة السوق المالية",
              "رسوم أداء (Carry): 15% - 25% من الأرباح فوق العائد المفضل"
            ]},
            { type: "heading", text: "آلية توزيع الأرباح (Waterfall)" },
            { type: "list", items: [
              "المرحلة 1: إرجاع رأس المال للمستثمرين أولاً",
              "المرحلة 2: عائد مفضّل (Preferred Return) - عادة 8% - 12% سنوياً",
              "المرحلة 3: تعويض GP (Catch-up) حتى يصل لنسبة الأرباح المتفق عليها",
              "المرحلة 4: توزيع الأرباح المتبقية (عادة 70/30 أو 80/20 لصالح LP)"
            ]},
            { type: "heading", text: "المتطلبات التنظيمية (السعودية)" },
            { type: "list", items: [
              "ترخيص من هيئة السوق المالية (CMA) للصناديق العامة",
              "الصناديق الخاصة: حد أدنى 50 مستثمر أو مستثمرون مؤهلون",
              "تقارير دورية للمستثمرين وهيئة السوق المالية",
              "حوكمة صارمة: لجنة استثمار، تقييمات مستقلة، تدقيق سنوي"
            ]},
            { type: "heading", text: "مخاطر وملاحظات مهمة" },
            { type: "list", items: [
              "تكلفة التأسيس والتشغيل مرتفعة مقارنة بالتمويل المباشر",
              "المطور يفقد جزءاً من السيطرة (قرارات تحتاج موافقة المستثمرين)",
              "الخروج مقيّد بفترة الصندوق وشروط الاسترداد",
              "الشفافية والتقارير الدورية التزام مستمر وليس اختيارياً",
              "مناسب فقط عندما يكون حجم المشروع يبرر تكاليف الهيكلة"
            ]}
          ]
        }
      ]
    },
    en: {
      title: "Real Estate Financing Methods",
      intro: "Choosing the financing method defines the deal structure, parties involved, costs, and return distribution. Each method has different requirements and implications.",
      cta: "Got it",
      tabs: [
        {
          id: "self",
          label: "Self-Funded",
          icon: "💰",
          content: [
            { type: "heading", text: "What is Self-Funding?" },
            { type: "text", text: "The developer funds the entire project from their own capital with no external debt or investors." },
            { type: "heading", text: "When is it used?" },
            { type: "list", items: [
              "Small to medium projects that don't require significant capital",
              "When the developer has sufficient liquidity and wants to avoid financing costs",
              "Short-term land development or infrastructure projects",
              "When bank terms are unfavorable or financing is unavailable"
            ]},
            { type: "heading", text: "Impact on Deal Structure" },
            { type: "text", text: "Simplest possible structure: no debt service, no investor obligations, no structuring or management fees. Developer owns 100% and bears all risk." },
            { type: "heading", text: "Key Risks" },
            { type: "list", items: [
              "Requires high liquidity that may be locked for extended periods",
              "Limits ability to execute multiple projects simultaneously",
              "Misses leverage benefit that amplifies return on equity",
              "Full risk borne by the developer alone"
            ]}
          ]
        },
        {
          id: "bank100",
          label: "100% Bank Debt",
          icon: "🏦",
          content: [
            { type: "heading", text: "What is 100% Bank Debt?" },
            { type: "text", text: "The bank finances the entire project cost (100% LTV). The developer owns the project but with no direct cash contribution." },
            { type: "heading", text: "When is it used?" },
            { type: "list", items: [
              "Developer has strong collateral assets but limited liquidity",
              "Government-backed or subsidized financing programs",
              "Strong credit history and banking relationship",
              "Projects with secured cash flows (pre-leased)"
            ]},
            { type: "heading", text: "Requirements" },
            { type: "list", items: [
              "Real estate collateral or personal guarantees",
              "Acceptable credit assessment and rating",
              "Detailed feasibility study and financial model",
              "Acceptable DSCR for the bank"
            ]},
            { type: "heading", text: "Key Risks" },
            { type: "list", items: [
              "Highest debt level — any revenue delay pressures DSCR",
              "Bank conditions may be restrictive (distribution locks, covenants)",
              "Rare in Saudi market without some developer contribution"
            ]}
          ]
        },
        {
          id: "debt",
          label: "Debt + Equity",
          icon: "🏗",
          content: [
            { type: "heading", text: "What is Debt + Equity?" },
            { type: "text", text: "The most common structure: part bank loan and part developer equity. LTV typically 50-70% in the Saudi market." },
            { type: "heading", text: "When is it used?" },
            { type: "list", items: [
              "Most medium to large real estate developments",
              "When the developer wants to leverage for higher ROE",
              "Projects with strong feasibility accepted by banks"
            ]},
            { type: "heading", text: "How it Works" },
            { type: "list", items: [
              "Developer contributes equity first (usually 30-50%)",
              "Bank draws loan progressively with construction",
              "Grace period during construction (interest accrues)",
              "Repayment starts from project revenue after completion"
            ]},
            { type: "heading", text: "Key Risks" },
            { type: "list", items: [
              "Finance cost reduces net return but leverage boosts ROE",
              "DSCR must stay above ~1.2x",
              "Bank covenants may restrict distributions",
              "In Islamic finance: structured as Murabaha or Ijara"
            ]}
          ]
        },
        {
          id: "fund",
          label: "Fund (GP/LP)",
          icon: "📊",
          content: [
            { type: "heading", text: "What is a Fund Structure (GP/LP)?" },
            { type: "text", text: "An investment vehicle pooling capital from multiple investors (LPs) managed by the developer or investment manager (GP). Used for large projects exceeding a single developer's capacity." },
            { type: "heading", text: "When is it used?" },
            { type: "list", items: [
              "Large projects (usually >SAR 100M)",
              "When developer needs more capital than available",
              "To attract institutional investors",
              "Long-term develop-and-hold strategies"
            ]},
            { type: "heading", text: "Parties Required" },
            { type: "list", items: [
              "GP (General Partner): Developer/investment manager",
              "LP (Limited Partners): Investors providing capital",
              "Fund Manager: GP or licensed financial entity (CMA)",
              "Custodian, Auditor, Legal Counsel"
            ]},
            { type: "heading", text: "Fees & Costs" },
            { type: "list", items: [
              "Structuring Fee: 1-3% one-time",
              "Subscription Fee: 1-2% at investor entry",
              "Management Fee: 1-2.5% annual on NAV",
              "Developer Fee: 3-8% of construction cost",
              "Performance Fee (Carry): 15-25% above preferred return"
            ]},
            { type: "heading", text: "Waterfall Distribution" },
            { type: "list", items: [
              "Tier 1: Return of Capital to investors",
              "Tier 2: Preferred Return (8-12% annual)",
              "Tier 3: GP Catch-up",
              "Tier 4: Profit Split (usually 70/30 or 80/20 to LP)"
            ]},
            { type: "heading", text: "Key Risks" },
            { type: "list", items: [
              "High setup and operating costs",
              "Developer loses some control to investors",
              "Regulatory requirements (CMA in Saudi)",
              "Ongoing transparency and reporting obligations"
            ]}
          ]
        }
      ]
    }
  },
  landType: {
    ar: {
      title: "أنواع حيازة الأرض",
      intro: "طريقة الحصول على الأرض تؤثر بشكل مباشر على هيكل التكاليف، المعالجة المحاسبية، حقوق الملكية، ومدة المشروع.",
      cta: "فهمت",
      tabs: [
        {
          id: "lease",
          label: "إيجار (حق انتفاع)",
          icon: "📋",
          content: [
            { type: "heading", text: "ما هو إيجار الأرض؟" },
            { type: "text", text: "المطور يستأجر الأرض من مالكها (حكومة أو قطاع خاص) لمدة محددة مقابل إيجار سنوي. المطور يملك المنشآت فقط وليس الأرض." },
            { type: "heading", text: "متى يُستخدم؟" },
            { type: "list", items: [
              "أراضي حكومية أو أوقاف لا تُباع لكن تُؤجر (شائع في السعودية)",
              "مشاريع الواجهات البحرية والمناطق الاقتصادية الخاصة",
              "عندما يكون سعر شراء الأرض مرتفعاً جداً",
              "مشاريع طويلة المدة (25-99 سنة) مثل الفنادق والوجهات السياحية"
            ]},
            { type: "heading", text: "مدد الإيجار الشائعة في السعودية" },
            { type: "list", items: [
              "المناطق الاقتصادية (MODON، كاوست، نيوم): 50 سنة قابلة للتجديد",
              "أراضي أمانات المدن: 25-30 سنة",
              "الأوقاف: 25-50 سنة حسب نوع الوقف",
              "هيئة تطوير المنطقة (مشاريع رؤية 2030): 50-99 سنة",
              "فترة السماح أثناء البناء: عادة 2-5 سنوات بدون إيجار"
            ]},
            { type: "heading", text: "المعالجة المالية" },
            { type: "list", items: [
              "الإيجار = مصروف تشغيلي سنوي (ليس CAPEX)",
              "قد تكون هناك فترة سماح (بدون إيجار أثناء البناء)",
              "الإيجار يتصاعد سنوياً حسب النسبة المتفق عليها",
              "إمكانية رسملة حق الانتفاع (تحويله لـ Equity) لأغراض التمويل",
              "القيمة = مساحة الأرض × سعر التقييم/م²"
            ]},
            { type: "heading", text: "المخاطر والملاحظات" },
            { type: "list", items: [
              "لا يملك المطور الأرض - المنشآت فقط",
              "عند انتهاء العقد قد تعود المنشآت للمالك",
              "تصاعد الإيجار يؤثر على التدفقات النقدية طويلة المدة",
              "شروط التجديد والتخارج المبكر يجب أن تكون واضحة في العقد"
            ]}
          ]
        },
        {
          id: "purchase",
          label: "شراء (تملك)",
          icon: "🏠",
          content: [
            { type: "heading", text: "ما هو شراء الأرض؟" },
            { type: "text", text: "المطور يشتري الأرض بالكامل (Freehold) قبل البناء. يملك الأرض والمنشآت معاً." },
            { type: "heading", text: "متى يُستخدم؟" },
            { type: "list", items: [
              "الأراضي الخاصة المعروضة للبيع",
              "مشاريع التطوير السكني والتجاري في المدن",
              "عندما يريد المطور ملكية كاملة وحرية تصرف مطلقة",
              "مشاريع البيع (Strata Sale) التي تُباع فيها الوحدات"
            ]},
            { type: "heading", text: "المعالجة المالية" },
            { type: "list", items: [
              "سعر الشراء = CAPEX أرض في السنة الأولى (قبل البناء)",
              "يُضاف إلى إجمالي تكلفة التطوير",
              "يدخل في قاعدة حساب التمويل البنكي (LTV)",
              "لا يوجد إيجار أرض سنوي - التكلفة لمرة واحدة فقط",
              "تكاليف إضافية: رسوم نقل الملكية 5% (ضريبة التصرفات العقارية) + سمسرة 2.5%"
            ]},
            { type: "heading", text: "المزايا" },
            { type: "list", items: [
              "ملكية كاملة بدون التزامات مستمرة",
              "قيمة الأرض قد ترتفع مع الوقت (مكسب رأسمالي)",
              "حرية كاملة في التصرف: بيع، رهن، تطوير إضافي",
              "أبسط في المعالجة المحاسبية والتمويلية"
            ]},
            { type: "heading", text: "المخاطر" },
            { type: "list", items: [
              "يتطلب رأس مال كبير مقدماً",
              "يقلل السيولة المتاحة لتكاليف البناء",
              "مخاطر انخفاض قيمة الأرض",
              "في بعض المناطق الشراء غير متاح (أراضي حكومية)"
            ]}
          ]
        },
        {
          id: "partner",
          label: "شراكة (حصة عينية)",
          icon: "🤝",
          content: [
            { type: "heading", text: "ما هي الأرض كشريك؟" },
            { type: "text", text: "مالك الأرض يساهم بها كحصة عينية (In-kind Equity) في المشروع أو الصندوق. لا يوجد دفع نقدي للأرض - المالك يحصل على نسبة من الأرباح مقابل الأرض." },
            { type: "heading", text: "متى يُستخدم؟" },
            { type: "list", items: [
              "عندما يملك شخص أرضاً لكن ليس لديه سيولة أو خبرة للتطوير",
              "مشاريع حكومية مشتركة (الحكومة تساهم بالأرض)",
              "شراكات استراتيجية بين مالك الأرض والمطور",
              "عندما يكون سعر الأرض مرتفعاً والمطور لا يريد تحمّل تكلفتها نقداً"
            ]},
            { type: "heading", text: "المعالجة المالية" },
            { type: "list", items: [
              "الأرض تُقيّم بتقييم مستقل ثم تُحسب كـ Equity",
              "مالك الأرض يحصل على نسبة ملكية بناءً على (قيمة الأرض / إجمالي قيمة المشروع)",
              "لا يوجد تدفق نقدي خارج للأرض (لا CAPEX ولا إيجار)",
              "حصة الأرض تؤثر على توزيع الأرباح وحقوق التصويت"
            ]},
            { type: "heading", text: "التحديات" },
            { type: "list", items: [
              "يحتاج تقييم مستقل متفق عليه من جميع الأطراف",
              "يقلل حصة المطور في الأرباح",
              "قد تنشأ خلافات على التقييم أو صلاحيات القرار",
              "يحتاج اتفاقية شراكة مفصلة تغطي الحوكمة والتخارج",
              "معقد في حالة الصناديق (يحتاج هيكلة قانونية خاصة)"
            ]}
          ]
        }
      ]
    },
    en: {
      title: "Land Acquisition Types",
      intro: "How the land is acquired directly affects cost structure, accounting treatment, ownership rights, and project timeline.",
      cta: "Got it",
      tabs: [
        {
          id: "lease",
          label: "Lease (Leasehold)",
          icon: "📋",
          content: [
            { type: "heading", text: "What is a Land Lease?" },
            { type: "text", text: "Developer leases the land from the owner (government or private) for a set period with annual rent. Developer owns the buildings only, not the land." },
            { type: "heading", text: "When is it used?" },
            { type: "list", items: [
              "Government or waqf land not available for sale (common in Saudi)",
              "Waterfront projects and special economic zones",
              "When land purchase price is prohibitively high",
              "Long-term projects (25-99 years) like hotels and tourism destinations"
            ]},
            { type: "heading", text: "Financial Treatment" },
            { type: "list", items: [
              "Rent = annual operating expense (not CAPEX)",
              "Grace period possible (no rent during construction)",
              "Rent escalates annually per agreed rate",
              "Leasehold can be capitalized (converted to equity) for financing",
              "Value = land area x appraisal rate/sqm"
            ]},
            { type: "heading", text: "Key Risks" },
            { type: "list", items: [
              "Developer doesn't own the land",
              "Buildings may revert to owner at lease end",
              "Escalating rent impacts long-term cash flows",
              "Renewal and early exit terms must be clear in the contract"
            ]}
          ]
        },
        {
          id: "purchase",
          label: "Purchase (Freehold)",
          icon: "🏠",
          content: [
            { type: "heading", text: "What is Land Purchase?" },
            { type: "text", text: "Developer buys the land outright (Freehold) before construction. Owns both land and buildings." },
            { type: "heading", text: "When is it used?" },
            { type: "list", items: [
              "Private land available for sale",
              "Residential and commercial urban developments",
              "When full ownership and control is needed",
              "Strata sale projects where units are sold individually"
            ]},
            { type: "heading", text: "Financial Treatment" },
            { type: "list", items: [
              "Purchase price = land CAPEX in year 0",
              "Added to total development cost",
              "Included in bank financing base (LTV)",
              "No annual land rent - one-time cost only"
            ]},
            { type: "heading", text: "Key Risks" },
            { type: "list", items: [
              "Requires large upfront capital",
              "Reduces liquidity for construction costs",
              "Land value depreciation risk",
              "Not available in some areas (government land)"
            ]}
          ]
        },
        {
          id: "partner",
          label: "Partner (In-kind)",
          icon: "🤝",
          content: [
            { type: "heading", text: "What is Land as Partner?" },
            { type: "text", text: "Landowner contributes land as in-kind equity. No cash payment for land - owner gets a profit share instead." },
            { type: "heading", text: "When is it used?" },
            { type: "list", items: [
              "Landowner has land but no liquidity or development expertise",
              "Government joint ventures (government contributes land)",
              "Strategic partnerships between landowner and developer",
              "When land price is high and developer wants to avoid cash outflow"
            ]},
            { type: "heading", text: "Financial Treatment" },
            { type: "list", items: [
              "Land is independently appraised and counted as equity",
              "Owner gets ownership % based on (land value / total project value)",
              "No cash outflow for land (no CAPEX, no rent)",
              "Land share affects profit distribution and voting rights"
            ]},
            { type: "heading", text: "Key Challenges" },
            { type: "list", items: [
              "Requires agreed independent valuation",
              "Reduces developer's profit share",
              "Potential disputes on valuation or decision authority",
              "Needs detailed partnership agreement covering governance and exit"
            ]}
          ]
        }
      ]
    }
  },
  exitStrategy: {
    ar: {
      title: "استراتيجيات التخارج",
      intro: "استراتيجية التخارج تحدد كيف ومتى يسترد المطور والمستثمرون أموالهم وأرباحهم من المشروع.",
      cta: "فهمت",
      tabs: [
        {
          id: "sale",
          label: "بيع (مضاعف)",
          icon: "🏷",
          content: [
            { type: "heading", text: "ما هو البيع بالمضاعف؟" },
            { type: "text", text: "بيع المشروع كاملاً لمشترٍ بسعر يُحسب كمضاعف للإيجار السنوي المستقر. مثلاً: إيجار 10 مليون × مضاعف 12 = سعر بيع 120 مليون." },
            { type: "heading", text: "متى يُستخدم؟" },
            { type: "list", items: [
              "الطريقة الأكثر شيوعاً للتخارج في التطوير العقاري",
              "بعد استقرار المشروع تشغيلياً (عادة 2-5 سنوات بعد الافتتاح)",
              "عندما يريد المطور/الصندوق تحويل العائد لسيولة",
              "أصول مدرّة للدخل مثل المكاتب والمحلات والفنادق"
            ]},
            { type: "heading", text: "كيف يُحسب السعر؟" },
            { type: "list", items: [
              "سعر البيع = الإيجار السنوي المستقر × المضاعف",
              "المضاعف يعتمد على: نوع الأصل، الموقع، جودة المستأجرين، مدة العقود",
              "في السعودية: 8x-12x للتجاري، 10x-15x للمكاتب الفاخرة",
              "تُخصم تكاليف البيع (سمسرة + قانوني) عادة 1.5% - 3%"
            ]},
            { type: "heading", text: "ملاحظات مهمة" },
            { type: "list", items: [
              "المضاعف الأعلى = سعر بيع أعلى = عائد أفضل",
              "يعتمد بشكل كبير على ظروف السوق وقت البيع",
              "يحتاج وقت لإتمام الصفقة (6-12 شهر عادة)",
              "في الصناديق: عائدات البيع توزع حسب حافز الأداء (Waterfall)"
            ]}
          ]
        },
        {
          id: "caprate",
          label: "بيع (رسملة)",
          icon: "📈",
          content: [
            { type: "heading", text: "ما هو البيع بالرسملة (Cap Rate)؟" },
            { type: "text", text: "نفس فكرة البيع لكن السعر يُحسب بطريقة معدل الرسملة: سعر البيع = صافي الدخل التشغيلي (NOI) ÷ معدل الرسملة." },
            { type: "heading", text: "الفرق عن المضاعف" },
            { type: "list", items: [
              "المضاعف يُحسب على الإيجار الإجمالي (Gross Rent × Multiple)",
              "الرسملة تُحسب على صافي الدخل بعد المصاريف (NOI ÷ Cap Rate)",
              "الرسملة أدق لأنها تأخذ المصاريف التشغيلية في الحسبان",
              "مثال: NOI = 8 مليون، Cap Rate = 8% → سعر = 100 مليون"
            ]},
            { type: "heading", text: "معدلات الرسملة في السعودية" },
            { type: "list", items: [
              "تجاري (محلات): 7% - 10%",
              "مكاتب: 7% - 9%",
              "سكني: 6% - 8%",
              "فنادق: 8% - 11%",
              "Cap Rate أقل = سعر بيع أعلى (الأصول الممتازة)"
            ]},
            { type: "heading", text: "متى يُفضل؟" },
            { type: "list", items: [
              "الأصول المدرّة للدخل مع مصاريف تشغيلية واضحة (فنادق، مولات)",
              "عندما يكون المشتري مستثمراً مؤسسياً يستخدم Cap Rate كمعيار",
              "المقارنة مع أصول مشابهة في السوق",
              "صناديق REITs التي تقيّم بناءً على NOI"
            ]},
            { type: "heading", text: "الأثر على النموذج المالي" },
            { type: "list", items: [
              "النموذج يحسب NOI = إيرادات التشغيل - مصاريف التشغيل (بدون خدمة الدين)",
              "سعر البيع = NOI المستقر ÷ Cap Rate المُدخل",
              "تُخصم تكاليف التخارج (سمسرة + قانوني) من سعر البيع",
              "الفرق عن المضاعف: Cap Rate يعطي نتيجة مختلفة إذا كانت المصاريف التشغيلية عالية"
            ]}
          ]
        },
        {
          id: "hold",
          label: "احتفاظ بالدخل",
          icon: "💎",
          content: [
            { type: "heading", text: "ما هو الاحتفاظ بالدخل؟" },
            { type: "text", text: "المطور لا يبيع المشروع بل يحتفظ به كأصل مدرّ للدخل. العائد يأتي من التدفقات النقدية التشغيلية فقط بدون حدث بيع." },
            { type: "heading", text: "متى يُستخدم؟" },
            { type: "list", items: [
              "مطور يريد بناء محفظة أصول طويلة المدة",
              "أصول ذات دخل مستقر ومتصاعد (مثل مراكز التسوق الناجحة)",
              "عندما تكون ظروف البيع غير مناسبة",
              "استراتيجية الأوقاف والصناديق السيادية",
              "في التمويل الذاتي: لا يوجد ضغط من مستثمرين للتخارج"
            ]},
            { type: "heading", text: "التأثير على العائد" },
            { type: "list", items: [
              "IRR عادة أقل من البيع (لأن القيمة لا تتحقق دفعة واحدة)",
              "لكن إجمالي الدخل التراكمي قد يكون أعلى على المدى الطويل",
              "العائد يعتمد على معدل الإشغال واستدامة الإيرادات",
              "MOIC يتراكم ببطء لكن بثبات"
            ]},
            { type: "heading", text: "ملاحظات" },
            { type: "list", items: [
              "لا يوجد حدث تخارج - النموذج يحسب العائد على كامل الأفق الزمني",
              "في الصناديق: يحتاج آلية واضحة لتوزيع الأرباح الدورية",
              "يتطلب إدارة تشغيلية مستمرة",
              "قد يحتاج إعادة تمويل (Refinance) لتوفير سيولة للمستثمرين"
            ]}
          ]
        }
      ]
    },
    en: {
      title: "Exit Strategies",
      intro: "The exit strategy determines how and when the developer and investors recover their capital and returns from the project.",
      cta: "Got it",
      tabs: [
        {
          id: "sale",
          label: "Sale (Multiple)",
          icon: "🏷",
          content: [
            { type: "heading", text: "What is Sale by Multiple?" },
            { type: "text", text: "Sell the entire project to a buyer at a price calculated as a multiple of stabilized annual rent. Example: 10M rent x 12x multiple = 120M sale price." },
            { type: "heading", text: "When is it used?" },
            { type: "list", items: [
              "Most common exit method in real estate development",
              "After project stabilization (usually 2-5 years after opening)",
              "When developer/fund wants to convert returns to cash",
              "Income-producing assets like offices, retail, hotels"
            ]},
            { type: "heading", text: "How is the price calculated?" },
            { type: "list", items: [
              "Sale price = Stabilized Annual Rent x Multiple",
              "Multiple depends on: asset type, location, tenant quality, lease terms",
              "Saudi market: 8x-12x commercial, 10x-15x premium offices",
              "Exit costs (brokerage + legal) deducted: typically 1.5-3%"
            ]},
            { type: "heading", text: "Key Notes" },
            { type: "list", items: [
              "Higher multiple = higher sale price = better returns",
              "Heavily dependent on market conditions at time of sale",
              "Typically takes 6-12 months to close",
              "In funds: sale proceeds distributed per waterfall"
            ]}
          ]
        },
        {
          id: "caprate",
          label: "Sale (Cap Rate)",
          icon: "📈",
          content: [
            { type: "heading", text: "What is Cap Rate Exit?" },
            { type: "text", text: "Same concept as sale, but price is calculated using capitalization rate: Sale Price = NOI / Cap Rate." },
            { type: "heading", text: "Difference from Multiple" },
            { type: "list", items: [
              "Multiple uses Gross Rent (Rent x Multiple)",
              "Cap Rate uses Net Operating Income (NOI / Cap Rate)",
              "Cap Rate is more precise as it accounts for operating expenses",
              "Example: NOI = 8M, Cap Rate = 8% -> Price = 100M"
            ]},
            { type: "heading", text: "Saudi Cap Rates" },
            { type: "list", items: [
              "Retail: 7-10%",
              "Office: 7-9%",
              "Residential: 6-8%",
              "Hotels: 8-11%",
              "Lower cap rate = higher price (premium assets)"
            ]},
            { type: "heading", text: "When preferred?" },
            { type: "list", items: [
              "Income assets with clear operating expenses",
              "Institutional buyers who use Cap Rate as benchmark",
              "Comparable asset analysis in the market"
            ]}
          ]
        },
        {
          id: "hold",
          label: "Hold for Income",
          icon: "💎",
          content: [
            { type: "heading", text: "What is Hold for Income?" },
            { type: "text", text: "Developer keeps the project as an income-generating asset. Returns come from operating cash flows only, with no sale event." },
            { type: "heading", text: "When is it used?" },
            { type: "list", items: [
              "Developer building a long-term asset portfolio",
              "Assets with stable, growing income",
              "When market conditions aren't right for a sale",
              "Endowment and sovereign fund strategies"
            ]},
            { type: "heading", text: "Impact on Returns" },
            { type: "list", items: [
              "IRR typically lower than sale (value not realized in lump sum)",
              "But total cumulative income may be higher long-term",
              "Returns depend on occupancy and income sustainability",
              "MOIC accumulates slowly but steadily"
            ]},
            { type: "heading", text: "Key Notes" },
            { type: "list", items: [
              "No exit event - model calculates return over full horizon",
              "In funds: needs clear periodic distribution mechanism",
              "Requires ongoing operational management",
              "May need refinancing to provide investor liquidity"
            ]}
          ]
        }
      ]
    }
  },
  waterfallConcepts: {
    ar: {
      title: "شلال التوزيعات - المفاهيم الأساسية",
      intro: "حافز الأداء (Waterfall) هو الآلية التي تحدد ترتيب وأولوية توزيع الأرباح بين المطور (GP) والمستثمرين (LP). فهم كل مرحلة ضروري لتقييم عدالة الهيكل.",
      cta: "فهمت",
      tabs: [
        {
          id: "overview",
          label: "نظرة عامة",
          icon: "📊",
          content: [
            { type: "heading", text: "ما هو شلال التوزيعات؟" },
            { type: "text", text: "نظام من 4 مراحل متسلسلة يحدد أولوية توزيع الأموال. كل مرحلة يجب أن تكتمل قبل الانتقال للتي بعدها." },
            { type: "heading", text: "لماذا يُستخدم؟" },
            { type: "list", items: [
              "يحمي المستثمرين بضمان استرداد رأس مالهم أولاً",
              "يحفّز المطور على تحقيق عوائد عالية (كلما زاد العائد زادت حصته)",
              "يوازن بين المخاطر والعوائد لجميع الأطراف",
              "معيار صناعي في صناديق الاستثمار العقاري عالمياً"
            ]},
            { type: "heading", text: "ترتيب المراحل" },
            { type: "list", items: [
              "المرحلة 1: إرجاع رأس المال (Return of Capital)",
              "المرحلة 2: العائد التفضيلي (Preferred Return)",
              "المرحلة 3: تعويض المطور (GP Catch-up)",
              "المرحلة 4: تقسيم الأرباح (Profit Split)"
            ]},
            { type: "heading", text: "مثال مبسّط" },
            { type: "text", text: "صندوق بـ 100 مليون Equity، عائد تفضيلي 10%، Carry 20%. بعد 5 سنوات حقق 180 مليون. التوزيع: (1) أول 100 مليون ترجع للمستثمرين، (2) الـ 50 مليون التالية تغطي العائد التفضيلي التراكمي، (3) GP يأخذ catch-up، (4) الباقي يتقسم 80/20." }
          ]
        },
        {
          id: "pref",
          label: "العائد التفضيلي",
          icon: "⭐",
          content: [
            { type: "heading", text: "ما هو العائد التفضيلي (Preferred Return)؟" },
            { type: "text", text: "حد أدنى للعائد السنوي يحصل عليه المستثمرون (LP) قبل أن يشارك المطور (GP) في أي أرباح. يُحسب كنسبة مئوية سنوية على رأس المال غير المسترد." },
            { type: "heading", text: "كيف يعمل؟" },
            { type: "list", items: [
              "يتراكم سنوياً على رأس المال غير المسترد",
              "إذا لم يُدفع في سنة معينة يتراكم للسنة التالية (Accrual)",
              "يجب سداد كامل المبلغ المتراكم قبل الانتقال للمرحلة 3",
              "عادة 8% - 15% سنوياً حسب مستوى المخاطرة"
            ]},
            { type: "heading", text: "نسبي أم للمستثمر فقط؟" },
            { type: "list", items: [
              "نسبي (Pro Rata): العائد التفضيلي يوزع على GP و LP حسب حصصهم في رأس المال",
              "للمستثمر فقط (LP Only): كامل العائد التفضيلي يذهب للمستثمرين",
              "الطريقة المختارة تؤثر على عوائد GP بشكل كبير"
            ]},
            { type: "heading", text: "معدلات شائعة في السعودية" },
            { type: "list", items: [
              "صناديق عقارية مستقرة: 8% - 10%",
              "مشاريع تطوير: 10% - 12%",
              "مشاريع عالية المخاطرة: 12% - 15%",
              "كلما زاد العائد التفضيلي، زادت حماية المستثمر لكن صعب تحقيقه"
            ]}
          ]
        },
        {
          id: "catchup",
          label: "تعويض المطور",
          icon: "🔄",
          content: [
            { type: "heading", text: "ما هو تعويض المطور (GP Catch-up)؟" },
            { type: "text", text: "بعد حصول المستثمرين على العائد التفضيلي، يأخذ المطور حصة أكبر مؤقتاً حتى يصل لنسبة الأرباح المتفق عليها (Carry)." },
            { type: "heading", text: "لماذا يوجد؟" },
            { type: "list", items: [
              "بدونه: المطور يحصل على Carry فقط على الأرباح فوق Pref",
              "معه: المطور يصل لنسبة Carry الكاملة من إجمالي الأرباح",
              "يضمن أن نسبة GP النهائية تعكس الـ Carry المتفق عليه",
              "شائع في معظم الصناديق العقارية المهنية"
            ]},
            { type: "heading", text: "طريقة الحساب" },
            { type: "list", items: [
              "سنوي (Per Year): يُحسب الـ catch-up كل سنة مستقل - أبسط وأوضح",
              "تراكمي (Cumulative): يُحسب على إجمالي التوزيعات من بداية الصندوق - أدق",
              "الطريقة السنوية هي الافتراضية في النموذج المرجعي"
            ]},
            { type: "heading", text: "مثال" },
            { type: "text", text: "أرباح = 100، Pref = 60 ذهبت لـ LP، Carry = 20%. بدون catch-up: GP يأخذ 20% من المتبقي (40 × 20% = 8). مع catch-up: GP يأخذ حتى يصل لـ 20% من إجمالي الأرباح (100 × 20% = 20)." },
            { type: "heading", text: "ملاحظات مهمة" },
            { type: "list", items: [
              "في السعودية: معظم الصناديق تستخدم catch-up بنسبة 100% (GP يأخذ كل شي حتى يتعادل)",
              "بعض الصناديق تستخدم catch-up جزئي (مثلاً 50%) - أبطأ للمطور",
              "بدون catch-up: GP يخسر جزء كبير من حصته خاصة إذا كان Pref عالي",
              "يجب أن يكون واضحاً في وثائق الصندوق لأنه يؤثر بشكل كبير على عوائد GP"
            ]}
          ]
        },
        {
          id: "split",
          label: "تقسيم الأرباح",
          icon: "💰",
          content: [
            { type: "heading", text: "ما هو تقسيم الأرباح (Profit Split)؟" },
            { type: "text", text: "المرحلة الأخيرة: الأرباح المتبقية بعد كل المراحل السابقة تُقسم بنسبة ثابتة بين المستثمرين والمطور." },
            { type: "heading", text: "النسب الشائعة" },
            { type: "list", items: [
              "80/20: المستثمرون 80% والمطور 20% (الأكثر شيوعاً)",
              "70/30: للمطورين ذوي السجل المميز",
              "90/10: صناديق كبيرة بمخاطر منخفضة",
              "60/40: نادر - فقط لمطورين لهم ميزة تنافسية استثنائية"
            ]},
            { type: "heading", text: "Carry (أتعاب حسن الأداء)" },
            { type: "list", items: [
              "Carry = نسبة المطور من الأرباح في هذه المرحلة",
              "عادة 20% - 30%",
              "هذه أهم آلية تحفيز للمطور",
              "كلما حقق المشروع عوائد أعلى، زاد مبلغ Carry للمطور"
            ]},
            { type: "heading", text: "MOIC و IRR" },
            { type: "list", items: [
              "MOIC (مضاعف رأس المال): إجمالي ما حصل عليه الطرف ÷ ما دفعه",
              "MOIC = 2x يعني ضعّف فلوسه، 3x = ثلاثة أضعاف",
              "IRR (معدل العائد الداخلي): يأخذ التوقيت في الاعتبار",
              "IRR أفضل لمقارنة الفرص لأنه يعكس سرعة العائد"
            ]},
            { type: "heading", text: "كيف تختار النسبة المناسبة؟" },
            { type: "list", items: [
              "المشاريع منخفضة المخاطرة: 80/20 أو 90/10 (المستثمر محمي أكثر)",
              "المطور بسجل مميز: يستطيع التفاوض على 70/30",
              "مشاريع التطوير (عالية المخاطرة): 80/20 مع catch-up هو الأكثر عدالة",
              "مشاريع الدخل المستقر: يمكن تقليل Carry لكن رفع رسوم الإدارة",
              "القاعدة: كلما زاد جهد ومخاطرة المطور، زادت حصته من الأرباح"
            ]}
          ]
        }
      ]
    },
    en: {
      title: "Waterfall Distribution - Core Concepts",
      intro: "The Waterfall defines the order and priority of profit distribution between developer (GP) and investors (LP). Understanding each tier is essential to evaluate deal fairness.",
      cta: "Got it",
      tabs: [
        {
          id: "overview",
          label: "Overview",
          icon: "📊",
          content: [
            { type: "heading", text: "What is a Distribution Waterfall?" },
            { type: "text", text: "A 4-tier sequential system that prioritizes how funds are distributed. Each tier must complete before moving to the next." },
            { type: "heading", text: "Why is it used?" },
            { type: "list", items: [
              "Protects investors by ensuring capital return first",
              "Incentivizes developer to achieve higher returns",
              "Balances risk and return for all parties",
              "Industry standard in real estate investment funds globally"
            ]},
            { type: "heading", text: "Tier Order" },
            { type: "list", items: [
              "Tier 1: Return of Capital",
              "Tier 2: Preferred Return",
              "Tier 3: GP Catch-up",
              "Tier 4: Profit Split"
            ]}
          ]
        },
        {
          id: "pref",
          label: "Preferred Return",
          icon: "⭐",
          content: [
            { type: "heading", text: "What is Preferred Return?" },
            { type: "text", text: "Minimum annual return to LPs before GP shares in any profits. Calculated as annual % on unreturned capital." },
            { type: "heading", text: "How it works" },
            { type: "list", items: [
              "Accrues annually on unreturned capital",
              "If unpaid in a year, it carries forward (accrual)",
              "Must be fully paid before Tier 3 begins",
              "Typically 8-15% depending on risk level"
            ]},
            { type: "heading", text: "Pro Rata vs LP Only" },
            { type: "list", items: [
              "Pro Rata: Pref distributed to GP and LP by ownership share",
              "LP Only: All pref goes exclusively to investors",
              "Choice significantly impacts GP economics"
            ]}
          ]
        },
        {
          id: "catchup",
          label: "GP Catch-up",
          icon: "🔄",
          content: [
            { type: "heading", text: "What is GP Catch-up?" },
            { type: "text", text: "After LPs receive their preferred return, GP temporarily takes a larger share until reaching their agreed carry percentage of total profits." },
            { type: "heading", text: "Why it exists" },
            { type: "list", items: [
              "Without it: GP only earns carry on profits above pref",
              "With it: GP reaches full carry % of total profits",
              "Ensures GP's final share reflects the agreed carry",
              "Standard in most professional real estate funds"
            ]},
            { type: "heading", text: "Calculation Method" },
            { type: "list", items: [
              "Per Year: catch-up calculated each year independently",
              "Cumulative: calculated on total distributions from fund start",
              "Per Year is simpler, Cumulative is more precise"
            ]}
          ]
        },
        {
          id: "split",
          label: "Profit Split",
          icon: "💰",
          content: [
            { type: "heading", text: "What is Profit Split?" },
            { type: "text", text: "Final tier: remaining profits after all previous tiers are split at a fixed ratio between LP and GP." },
            { type: "heading", text: "Common Ratios" },
            { type: "list", items: [
              "80/20: LP 80% / GP 20% (most common)",
              "70/30: For developers with proven track record",
              "90/10: Large funds with lower risk",
              "Carry = GP's share in this tier (usually 20-30%)"
            ]},
            { type: "heading", text: "MOIC & IRR" },
            { type: "list", items: [
              "MOIC: Total received / Total invested (2x = doubled money)",
              "IRR: Accounts for timing of cash flows",
              "IRR better for comparing opportunities (reflects speed of return)"
            ]}
          ]
        }
      ]
    }
  },
  islamicFinance: {
    ar: {
      title: "هياكل التمويل الإسلامي",
      intro: "في السعودية معظم التمويل البنكي يتم وفق أحكام الشريعة الإسلامية. الفرق ليس فقط في المسمى بل في الهيكل القانوني والملكية وتوزيع المخاطر.",
      cta: "فهمت",
      tabs: [
        {
          id: "murabaha",
          label: "المرابحة",
          icon: "🏦",
          content: [
            { type: "heading", text: "ما هي المرابحة؟" },
            { type: "text", text: "البنك يشتري الأصل (أرض، مواد بناء، معدات) ثم يبيعه للعميل بسعر أعلى يشمل هامش ربح معلوم ومتفق عليه. الدفع يكون بأقساط على فترة محددة." },
            { type: "heading", text: "كيف تعمل في التطوير العقاري؟" },
            { type: "list", items: [
              "البنك يشتري الأرض أو مواد البناء نيابةً عن المطور",
              "يبيعها للمطور بسعر التكلفة + هامش ربح (يعادل نسبة الفائدة)",
              "السداد على أقساط حسب جدول متفق عليه",
              "الملكية تنتقل للمطور فوراً بعد البيع",
              "السحب يتم على دفعات مع تقدم البناء (مثل القرض التقليدي)"
            ]},
            { type: "heading", text: "الفرق عن القرض التقليدي" },
            { type: "list", items: [
              "البنك يملك الأصل لحظة (ولو شكلياً) قبل بيعه - لا يقرض مال مباشرة",
              "الربح ثابت ومعلوم من البداية (لا يتغير مع السوق في المرابحة الثابتة)",
              "في المرابحة المتغيرة: الهامش مرتبط بـ SAIBOR ويتغير دورياً",
              "لا يوجد \"فائدة\" بل \"هامش ربح\" - الأثر المالي مشابه",
              "في النموذج المالي: المعالجة الحسابية متطابقة تقريباً مع القرض التقليدي"
            ]},
            { type: "heading", text: "الاستخدام في السعودية" },
            { type: "list", items: [
              "الأكثر شيوعاً في تمويل شراء الأراضي والعقارات الجاهزة",
              "معتمد من جميع البنوك السعودية (الراجحي، الأهلي، الإنماء، البلاد، الجزيرة)",
              "الهامش عادة SAIBOR + 1.5% إلى 3.5% حسب الملف الائتماني",
              "مقبول من هيئة السوق المالية والبنك المركزي (ساما)"
            ]},
            { type: "heading", text: "المخاطر والملاحظات" },
            { type: "list", items: [
              "المرابحة المتغيرة: ارتفاع SAIBOR يرفع تكلفة التمويل مباشرة",
              "السداد المبكر: بعض البنوك لا تخصم هامش الربح المتبقي بالكامل",
              "التحويل بين البنوك (شراء المديونية) ممكن لكن بتكاليف إضافية",
              "يجب التأكد من موافقة الهيئة الشرعية للبنك على هيكل الصفقة",
              "رسوم الترتيب والتقييم والقانونية تُضاف فوق هامش الربح"
            ]}
          ]
        },
        {
          id: "ijara",
          label: "الإجارة",
          icon: "📄",
          content: [
            { type: "heading", text: "ما هي الإجارة المنتهية بالتمليك؟" },
            { type: "text", text: "البنك يشتري الأصل ويؤجره للعميل لفترة محددة. عند انتهاء الإجارة ينتقل ملكية الأصل للعميل. أثناء الإجارة البنك هو المالك القانوني." },
            { type: "heading", text: "كيف تعمل في التطوير العقاري؟" },
            { type: "list", items: [
              "البنك يشتري العقار أو جزءاً منه (أو يموّل البناء)",
              "يؤجره للمطور بأجرة شهرية/ربع سنوية",
              "الأجرة تشمل جزء إيجار + جزء يُسدد من الأصل",
              "في نهاية المدة: المطور يملك العقار بسعر رمزي أو مجاناً",
              "يمكن هيكلتها كإجارة موصوفة بالذمة (Forward Lease) للمشاريع تحت الإنشاء"
            ]},
            { type: "heading", text: "الفرق عن المرابحة" },
            { type: "list", items: [
              "في الإجارة: البنك يظل مالكاً طوال فترة العقد (مسؤول عن التأمين نظرياً)",
              "في المرابحة: الملكية تنتقل فوراً بعد البيع",
              "الإجارة أنسب للأصول المدرّة للدخل (المطور يستخدم دخل الإيجار للسداد)",
              "المرابحة أنسب لتمويل شراء الأراضي ومواد البناء",
              "الإجارة تسمح بإعادة تسعير الأجرة دورياً (مرونة أكبر)"
            ]},
            { type: "heading", text: "المزايا" },
            { type: "list", items: [
              "مرونة في هيكلة الأقساط (موسمية، متصاعدة، ثابتة)",
              "البنك يتحمل مخاطر ملكية الأصل نظرياً (تأمين، صيانة هيكلية)",
              "إمكانية إعادة تسعير الأجرة دورياً مع تغير SAIBOR",
              "مناسب لمشاريع التأجير والتشغيل طويلة المدة (فنادق، مولات)"
            ]},
            { type: "heading", text: "المخاطر والملاحظات" },
            { type: "list", items: [
              "المطور لا يملك الأصل حتى نهاية العقد - لا يستطيع بيعه أو رهنه",
              "بعض البنوك تحمّل المستأجر (المطور) كل تكاليف الصيانة والتأمين عملياً",
              "إعادة التسعير الدوري قد تزيد الأجرة في حال ارتفاع SAIBOR",
              "التخارج المبكر قد يكون مكلفاً (غرامات أو تعويض للبنك)",
              "يحتاج موافقة الهيئة الشرعية على هيكل العقد"
            ]},
            { type: "heading", text: "في النموذج المالي" },
            { type: "list", items: [
              "الأثر الحسابي مشابه جداً للقرض التقليدي والمرابحة",
              "الفرق في المسمى: \"أجرة\" بدل \"قسط\"، \"ربح\" بدل \"فائدة\"",
              "DSCR والنسب المالية تُحسب بنفس الطريقة",
              "التقارير البنكية تستخدم المصطلحات الشرعية المناسبة"
            ]}
          ]
        },
        {
          id: "conventional",
          label: "تقليدي",
          icon: "💳",
          content: [
            { type: "heading", text: "ما هو التمويل التقليدي؟" },
            { type: "text", text: "قرض مباشر من البنك للعميل بفائدة. البنك لا يملك الأصل - فقط يُقرض المال ويأخذ ضمانات. غير متوافق مع الشريعة الإسلامية." },
            { type: "heading", text: "متى يُستخدم؟" },
            { type: "list", items: [
              "تمويل من بنوك دولية ليس لها نوافذ شرعية (HSBC، Standard Chartered)",
              "تمويل مشاريع خارج السعودية حيث البدائل الإسلامية محدودة",
              "برامج تمويل حكومية أو دولية بشروط خاصة (IFC، EBRD)",
              "عندما تكون الفائدة المتغيرة أفضل من هامش المرابحة الثابت",
              "مشاريع مشتركة مع شركاء أجانب يفضلون الهياكل التقليدية"
            ]},
            { type: "heading", text: "الفرق الجوهري عن الإسلامي" },
            { type: "list", items: [
              "فائدة على المبلغ المقترض (بسيطة أو مركبة) - ليست هامش ربح على بيع",
              "الفائدة قد تكون ثابتة أو متغيرة (مرتبطة بـ LIBOR/SOFR أو SAIBOR)",
              "البنك لا يملك الأصل في أي مرحلة - فقط يرهنه كضمان",
              "لا يحتاج موافقة هيئة شرعية",
              "أبسط قانونياً وأسرع في التنفيذ لكن لا يتوافق مع الشريعة"
            ]},
            { type: "heading", text: "التوفر في السعودية" },
            { type: "list", items: [
              "معظم البنوك السعودية تحولت بالكامل للمنتجات الإسلامية",
              "التمويل التقليدي متاح فقط من بعض الفروع الأجنبية",
              "صناديق الاستثمار العقاري في السعودية ملزمة بالتوافق الشرعي",
              "قد يكون مقبولاً في المناطق الحرة أو المشاريع الدولية"
            ]},
            { type: "heading", text: "في النموذج المالي" },
            { type: "list", items: [
              "الحسابات متطابقة مع المرابحة والإجارة رقمياً",
              "الفرق فقط في المصطلحات: فائدة vs ربح vs أجرة",
              "النموذج يتعامل مع الثلاثة بنفس المنطق الحسابي",
              "الاختيار يؤثر على التقارير والمصطلحات المستخدمة فقط"
            ]}
          ]
        }
      ]
    },
    en: {
      title: "Islamic Finance Structures",
      intro: "In Saudi Arabia most bank financing follows Sharia principles. The difference is not just naming but legal structure, ownership, and risk allocation.",
      cta: "Got it",
      tabs: [
        {
          id: "murabaha",
          label: "Murabaha",
          icon: "🏦",
          content: [
            { type: "heading", text: "What is Murabaha?" },
            { type: "text", text: "Bank purchases the asset (land, materials, equipment) then sells it to the client at cost plus an agreed profit margin. Payment is in installments." },
            { type: "heading", text: "How it works in real estate" },
            { type: "list", items: [
              "Bank purchases land or construction materials on behalf of developer",
              "Sells to developer at cost + profit margin (equivalent to interest rate)",
              "Repayment in installments per agreed schedule",
              "Ownership transfers to developer immediately after sale"
            ]},
            { type: "heading", text: "Difference from conventional loan" },
            { type: "list", items: [
              "Bank momentarily owns the asset before selling - doesn't lend money directly",
              "Profit is fixed and known upfront (doesn't fluctuate)",
              "No 'interest' but 'profit margin' - financial impact is similar",
              "In the financial model: calculations are nearly identical"
            ]}
          ]
        },
        {
          id: "ijara",
          label: "Ijara",
          icon: "📄",
          content: [
            { type: "heading", text: "What is Ijara (Lease-to-Own)?" },
            { type: "text", text: "Bank purchases the asset and leases it to the client. At lease end, ownership transfers to client. During the lease, bank remains legal owner." },
            { type: "heading", text: "How it works in real estate" },
            { type: "list", items: [
              "Bank purchases the property or portion of it",
              "Leases to developer at periodic rent",
              "Rent includes lease portion + principal repayment",
              "At end: developer owns at nominal or zero price"
            ]},
            { type: "heading", text: "Difference from Murabaha" },
            { type: "list", items: [
              "Ijara: bank remains owner throughout the contract",
              "Murabaha: ownership transfers immediately after sale",
              "Ijara better for income-producing assets",
              "Murabaha better for land purchase and construction materials"
            ]}
          ]
        },
        {
          id: "conventional",
          label: "Conventional",
          icon: "💳",
          content: [
            { type: "heading", text: "What is Conventional Finance?" },
            { type: "text", text: "Direct loan from bank to client at interest. Bank doesn't own the asset - only lends money against collateral." },
            { type: "heading", text: "When is it used?" },
            { type: "list", items: [
              "Financing from international banks without Sharia windows",
              "Projects outside Saudi Arabia",
              "Government or international programs with special terms"
            ]},
            { type: "heading", text: "In the financial model" },
            { type: "list", items: [
              "Calculations are identical to Murabaha and Ijara numerically",
              "Only difference is terminology: interest vs profit vs rent",
              "Model treats all three with the same calculation logic"
            ]}
          ]
        }
      ]
    }
  },
  govIncentives: {
    ar: {
      title: "الحوافز الحكومية للتطوير العقاري",
      intro: "الحكومة السعودية تقدم عدة أنواع من الحوافز لتشجيع التطوير العقاري في مناطق معينة أو لقطاعات محددة. هذه الحوافز تؤثر مباشرة على جدوى المشروع وعائد المستثمر.",
      cta: "فهمت",
      tabs: [
        {
          id: "capexGrant",
          label: "منحة CAPEX",
          icon: "🏗",
          content: [
            { type: "heading", text: "ما هي منحة CAPEX؟" },
            { type: "text", text: "الحكومة تدفع نسبة من تكاليف البناء مباشرة للمطور. تخفض التكلفة الفعلية للمشروع وترفع العائد على الاستثمار." },
            { type: "heading", text: "كيف تعمل؟" },
            { type: "list", items: [
              "نسبة محددة من تكلفة البناء (عادة 10% - 30%)",
              "حد أقصى بالريال (مثلاً 50 مليون ريال)",
              "تُصرف خلال البناء (مع مستخلصات المقاول) أو عند الإنجاز",
              "تحتاج استيفاء شروط ومعايير محددة من الجهة المانحة"
            ]},
            { type: "heading", text: "الأثر على النموذج المالي" },
            { type: "list", items: [
              "تخفض صافي CAPEX المطلوب تمويله",
              "تقلل حجم الدين أو الـ Equity المطلوب",
              "ترفع IRR مباشرة (لأن التكلفة أقل)",
              "لا تؤثر على الإيرادات - فقط على جانب التكاليف"
            ]},
            { type: "heading", text: "أمثلة" },
            { type: "list", items: [
              "هيئة المدن الاقتصادية: منح للمشاريع في المدن الاقتصادية",
              "صندوق التنمية السياحي: دعم مشاريع الضيافة والسياحة",
              "برنامج جدة التاريخية: حوافز لإعادة تطوير المنطقة التاريخية",
              "وزارة الاستثمار: حوافز للمشاريع الأجنبية المشتركة"
            ]}
          ]
        },
        {
          id: "landRent",
          label: "إعفاء إيجار الأرض",
          icon: "🌍",
          content: [
            { type: "heading", text: "ما هو إعفاء إيجار الأرض؟" },
            { type: "text", text: "الحكومة أو الجهة المالكة تعفي المطور من إيجار الأرض لفترة محددة (عادة فترة البناء + سنوات إضافية) أو تخفض النسبة بشكل كبير." },
            { type: "heading", text: "الأنواع الشائعة" },
            { type: "list", items: [
              "إعفاء كامل: بدون إيجار لمدة محددة (مثلاً 5-10 سنوات)",
              "إعفاء جزئي: تخفيض بنسبة (مثلاً 50% لمدة 7 سنوات)",
              "تدريجي: إعفاء كامل أول 3 سنوات ثم 50% ثم السعر الكامل",
              "مرتبط بالإنجاز: الإعفاء يسري حتى اكتمال البناء"
            ]},
            { type: "heading", text: "الأثر على النموذج المالي" },
            { type: "list", items: [
              "يقلل المصاريف التشغيلية في السنوات الأولى",
              "يحسّن التدفقات النقدية أثناء فترة التطوير والتشغيل المبكر",
              "يرفع DSCR في السنوات الأولى (مهم للبنك)",
              "يخفض نقطة التعادل (Break-even)"
            ]},
            { type: "heading", text: "ملاحظات" },
            { type: "list", items: [
              "ينطبق فقط على أراضي الإيجار (Leasehold) وليس الشراء",
              "قد تكون هناك شروط أداء (مثل الانتهاء خلال مدة محددة)",
              "الإيجار بعد انتهاء الإعفاء قد يكون بالسعر الكامل فوراً",
              "يجب حساب القيمة الحالية للوفر لتقييم الأثر الحقيقي"
            ]}
          ]
        },
        {
          id: "finSupport",
          label: "دعم التمويل",
          icon: "💜",
          content: [
            { type: "heading", text: "ما هو دعم التمويل؟" },
            { type: "text", text: "الحكومة تتحمل جزءاً من تكلفة التمويل البنكي (فائدة/ربح) أو تقدم قرضاً ميسراً بشروط أفضل من السوق." },
            { type: "heading", text: "الأنواع" },
            { type: "list", items: [
              "دعم الفائدة: الحكومة تدفع جزء من نسبة الربح (مثلاً 2% من 7%)",
              "قرض ميسّر: قرض بنسبة ربح أقل من السوق وفترة أطول",
              "ضمان حكومي: كفالة حكومية تقلل مخاطر البنك وبالتالي النسبة",
              "تمويل بدون أرباح: نادر لكن متاح لبعض المشاريع الاستراتيجية"
            ]},
            { type: "heading", text: "الأثر على النموذج المالي" },
            { type: "list", items: [
              "يقلل تكلفة خدمة الدين سنوياً",
              "يرفع DSCR ويحسّن الموقف أمام البنك",
              "يخفض نقطة التعادل للمشروع",
              "في الصناديق: يرفع العائد للمستثمرين مباشرة"
            ]},
            { type: "heading", text: "مصادر الدعم في السعودية" },
            { type: "list", items: [
              "صندوق التنمية العقارية: للمشاريع السكنية",
              "صندوق التنمية السياحي: للفنادق والمنتجعات",
              "صندوق التنمية الصناعية: للمشاريع الصناعية واللوجستية",
              "بنك التصدير والاستيراد: للمشاريع ذات البعد التصديري"
            ]}
          ]
        },
        {
          id: "feeRebates",
          label: "استرداد الرسوم",
          icon: "🔄",
          content: [
            { type: "heading", text: "ما هو استرداد الرسوم؟" },
            { type: "text", text: "إعفاء أو تخفيض الرسوم الحكومية المرتبطة بالمشروع مثل رسوم التراخيص وربط الخدمات والضرائب البلدية." },
            { type: "heading", text: "الرسوم التي قد تُعفى" },
            { type: "list", items: [
              "رسوم رخصة البناء",
              "رسوم ربط الكهرباء والمياه والصرف",
              "رسوم الطرق والبنية التحتية",
              "رسوم التصنيف الفندقي والتراخيص السياحية",
              "رسوم بلدية سنوية"
            ]},
            { type: "heading", text: "طريقة الاسترداد" },
            { type: "list", items: [
              "إعفاء مباشر: الرسم لا يُطلب من الأساس",
              "استرداد: المطور يدفع ثم يسترد من الجهة الحكومية",
              "تأجيل: دفع الرسم لاحقاً (مثلاً بعد 3 سنوات) بتخفيض",
              "مقاصة: خصم الرسوم من مستحقات أخرى"
            ]},
            { type: "heading", text: "الأثر على النموذج" },
            { type: "list", items: [
              "يقلل التكاليف الأولية (CAPEX) أو التكاليف التشغيلية",
              "قد يكون مبلغ صغير نسبياً لكنه مؤثر في المشاريع الصغيرة",
              "مهم احتسابه في تحليل الجدوى الشامل",
              "يجب التحقق من الاستمرارية (هل الإعفاء مؤقت أم دائم)"
            ]}
          ]
        }
      ]
    },
    en: {
      title: "Government Incentives for Real Estate Development",
      intro: "The Saudi government offers several types of incentives to encourage development in specific areas or sectors. These directly impact project feasibility and investor returns.",
      cta: "Got it",
      tabs: [
        {
          id: "capexGrant",
          label: "CAPEX Grant",
          icon: "🏗",
          content: [
            { type: "heading", text: "What is a CAPEX Grant?" },
            { type: "text", text: "Government pays a percentage of construction costs directly to the developer. Reduces effective project cost and improves ROI." },
            { type: "heading", text: "How it works" },
            { type: "list", items: [
              "Set percentage of construction cost (typically 10-30%)",
              "Capped at a maximum SAR amount",
              "Disbursed during construction or at completion",
              "Requires meeting specific criteria from the granting authority"
            ]},
            { type: "heading", text: "Impact on financial model" },
            { type: "list", items: [
              "Reduces net CAPEX requiring financing",
              "Reduces debt or equity needed",
              "Directly improves IRR (lower cost base)",
              "No impact on revenue - cost side only"
            ]}
          ]
        },
        {
          id: "landRent",
          label: "Land Rent Rebate",
          icon: "🌍",
          content: [
            { type: "heading", text: "What is a Land Rent Rebate?" },
            { type: "text", text: "Government or landowner waives/reduces land rent for a specified period (usually construction + additional years)." },
            { type: "heading", text: "Common types" },
            { type: "list", items: [
              "Full waiver: no rent for a set period (e.g. 5-10 years)",
              "Partial: percentage reduction (e.g. 50% for 7 years)",
              "Graduated: full waiver first 3 years, then 50%, then full price",
              "Completion-linked: waiver until construction is complete"
            ]},
            { type: "heading", text: "Impact" },
            { type: "list", items: [
              "Reduces OPEX in early years",
              "Improves cash flow during development and early operations",
              "Raises DSCR in initial years (important for bank)",
              "Only applies to leasehold land, not purchased"
            ]}
          ]
        },
        {
          id: "finSupport",
          label: "Finance Support",
          icon: "💜",
          content: [
            { type: "heading", text: "What is Finance Support?" },
            { type: "text", text: "Government covers part of bank financing cost (interest/profit) or provides a soft loan at below-market terms." },
            { type: "heading", text: "Types" },
            { type: "list", items: [
              "Interest subsidy: gov pays portion of profit rate",
              "Soft loan: below-market rate with longer tenor",
              "Government guarantee: reduces bank risk and rate",
              "Zero-profit financing: rare, for strategic projects"
            ]},
            { type: "heading", text: "Saudi sources" },
            { type: "list", items: [
              "Real Estate Development Fund: residential projects",
              "Tourism Development Fund: hotels and resorts",
              "Industrial Development Fund: industrial/logistics",
              "Saudi EXIM Bank: export-oriented projects"
            ]}
          ]
        },
        {
          id: "feeRebates",
          label: "Fee Rebates",
          icon: "🔄",
          content: [
            { type: "heading", text: "What are Fee Rebates?" },
            { type: "text", text: "Waiver or reduction of government fees related to the project such as construction permits, utility connections, and municipal charges." },
            { type: "heading", text: "Fees that may be waived" },
            { type: "list", items: [
              "Construction permit fees",
              "Electricity, water, sewage connection fees",
              "Road and infrastructure fees",
              "Hotel classification and tourism licenses",
              "Annual municipal fees"
            ]},
            { type: "heading", text: "Impact" },
            { type: "list", items: [
              "Reduces upfront (CAPEX) or operating costs",
              "May be small in absolute terms but impactful for smaller projects",
              "Must verify if waiver is temporary or permanent"
            ]}
          ]
        }
      ]
    }
  },
  financialMetrics: {
    ar: {
      title: "المقاييس المالية الأساسية",
      intro: "هذه المقاييس هي اللغة المشتركة بين المطورين والبنوك والمستثمرين. فهمها ضروري لتقييم أي مشروع عقاري.",
      cta: "فهمت",
      tabs: [
        {
          id: "irr",
          label: "IRR",
          icon: "📈",
          content: [
            { type: "heading", text: "ما هو IRR (معدل العائد الداخلي)؟" },
            { type: "text", text: "النسبة المئوية السنوية اللي تخلي صافي القيمة الحالية (NPV) للتدفقات النقدية تساوي صفر. ببساطة: كم نسبة العائد السنوي اللي يحققه المشروع فعلياً." },
            { type: "heading", text: "لماذا IRR مهم؟" },
            { type: "list", items: [
              "المقياس الأول اللي يسأل عنه أي مستثمر أو بنك",
              "يأخذ توقيت التدفقات النقدية في الاعتبار (فلوس اليوم أهم من فلوس بكرة)",
              "يسمح بمقارنة مشاريع مختلفة الحجم والمدة",
              "IRR أعلى = المشروع يعيد الفلوس أسرع وبعائد أكبر"
            ]},
            { type: "heading", text: "Unlevered IRR vs Levered IRR" },
            { type: "list", items: [
              "Unlevered (قبل التمويل): عائد المشروع نفسه بدون أي دين. يعكس جودة المشروع المجردة",
              "Levered (بعد التمويل): عائد المشروع بعد خصم خدمة الدين. يعكس العائد الفعلي على رأس المال",
              "عادة Levered > Unlevered بسبب الرافعة المالية (لو المشروع ناجح)",
              "لو Levered < Unlevered: تكلفة الدين تأكل العائد (الرافعة سلبية)"
            ]},
            { type: "heading", text: "معدلات شائعة في السوق السعودي" },
            { type: "list", items: [
              "مشروع عقاري تجاري ناجح: Unlevered 12%-18%",
              "صندوق عقاري (LP): 15%-25%",
              "مشروع فندقي/سياحي: 10%-20% (أعلى مخاطرة)",
              "أقل من 8% عادة غير جاذب للمستثمرين"
            ]},
            { type: "heading", text: "محددات IRR" },
            { type: "list", items: [
              "لا يعكس حجم الربح الفعلي (مشروع صغير ممكن يكون IRR عالي لكن الربح قليل)",
              "يفترض إعادة استثمار التدفقات بنفس النسبة (قد لا يكون واقعي)",
              "حساس جداً لتوقيت التدفقات (تأخير 6 أشهر يغير IRR بشكل كبير)",
              "لذلك نستخدمه مع NPV و MOIC معاً وليس وحده"
            ]}
          ]
        },
        {
          id: "npv",
          label: "NPV",
          icon: "💵",
          content: [
            { type: "heading", text: "ما هو NPV (صافي القيمة الحالية)؟" },
            { type: "text", text: "مجموع كل التدفقات النقدية المستقبلية بعد خصمها بمعدل محدد لتحويلها لقيمتها اليوم. لو NPV موجب = المشروع يحقق عائد أعلى من معدل الخصم." },
            { type: "heading", text: "المعادلة" },
            { type: "text", text: "NPV = مجموع (التدفق النقدي في السنة y ÷ (1 + معدل الخصم) أس y) لكل سنة من 0 إلى نهاية الأفق" },
            { type: "heading", text: "ليش نحسب NPV بـ 10% و 12% و 14%؟" },
            { type: "list", items: [
              "كل معدل خصم يمثل توقع مختلف لتكلفة رأس المال أو العائد المطلوب",
              "10%: تكلفة رأس مال متحفظة — لو NPV موجب، المشروع يتجاوز الحد الأدنى",
              "12%: عائد مطلوب متوسط — المعيار الأكثر استخداماً في السوق السعودي",
              "14%: عائد مطلوب مرتفع — يعكس مشاريع عالية المخاطرة أو مستثمرين يطلبون عائد عالي",
              "لو NPV موجب عند 14%: المشروع ممتاز حتى بأعلى توقعات",
              "لو NPV سالب عند 10%: المشروع ما يحقق الحد الأدنى"
            ]},
            { type: "heading", text: "كيف نقرأ NPV؟" },
            { type: "list", items: [
              "NPV > 0: المشروع يخلق قيمة — يحقق أكثر من معدل الخصم",
              "NPV = 0: المشروع يحقق بالضبط معدل الخصم (IRR = معدل الخصم)",
              "NPV < 0: المشروع يخسر قيمة مقارنة بالبديل",
              "NPV يُقاس بالريال — يعطيك حجم القيمة المضافة وليس فقط النسبة"
            ]},
            { type: "heading", text: "الفرق بين NPV و IRR" },
            { type: "list", items: [
              "IRR يعطي النسبة (%) — NPV يعطي المبلغ (ريال)",
              "IRR أفضل للمقارنة بين مشاريع — NPV أفضل لقرار استثماري واحد",
              "مشروعان بنفس IRR ممكن يكون NPV مختلف جداً (حجم مختلف)",
              "القاعدة: استخدم الاثنين معاً. لا تعتمد على مقياس واحد فقط"
            ]}
          ]
        },
        {
          id: "moic",
          label: "MOIC",
          icon: "✖",
          content: [
            { type: "heading", text: "ما هو MOIC (مضاعف رأس المال)؟" },
            { type: "text", text: "كم مرة ضاعف المستثمر فلوسه. MOIC = إجمالي التوزيعات المستلمة ÷ رأس المال المستثمر. لو MOIC = 2.5x يعني حصل 2.5 ريال لكل ريال استثمره." },
            { type: "heading", text: "نوعان من MOIC" },
            { type: "list", items: [
              "Paid-In MOIC: التوزيعات ÷ رأس المال المدفوع فعلياً (equity calls)",
              "Committed MOIC: التوزيعات ÷ رأس المال الملتزم (equity المتفق عليه)",
              "Paid-In أعلى لأن المدفوع عادة أقل من الملتزم (لو ما تم سحب كل الـ equity)",
              "Committed هو المعيار الأكثر استخداماً في تقارير الصناديق"
            ]},
            { type: "heading", text: "لماذا MOIC مهم مع IRR؟" },
            { type: "list", items: [
              "IRR ممكن يكون عالي لكن MOIC منخفض (مشروع سريع لكن ربح قليل)",
              "MOIC ممكن يكون عالي لكن IRR منخفض (مشروع بطيء لكن ربح كبير)",
              "المستثمر المؤسسي يبحث عن IRR > 15% مع MOIC > 2x كحد أدنى",
              "في الصناديق: GP يهتم بـ IRR (يحدد الأداء)، LP يهتم بـ MOIC (يحدد الربح الفعلي)"
            ]},
            { type: "heading", text: "مثال" },
            { type: "text", text: "استثمرت 10 مليون. بعد 7 سنوات حصلت 35 مليون إجمالي. MOIC = 35 ÷ 10 = 3.5x. يعني 3.5 أضعاف رأس المال. الربح الصافي = 25 مليون (250%)." }
          ]
        },
        {
          id: "dscr",
          label: "DSCR",
          icon: "🏦",
          content: [
            { type: "heading", text: "ما هو DSCR (نسبة تغطية خدمة الدين)؟" },
            { type: "text", text: "كم مرة يغطي دخل المشروع أقساط البنك. DSCR = صافي الدخل التشغيلي ÷ خدمة الدين (أقساط + أرباح). DSCR = 1.5x يعني الدخل يغطي القسط مرة ونصف." },
            { type: "heading", text: "لماذا البنك يهتم بـ DSCR؟" },
            { type: "list", items: [
              "DSCR هو المقياس رقم 1 اللي يحدد هل البنك يوافق على التمويل أو لا",
              "يقيس قدرة المشروع على سداد التزاماته من دخله التشغيلي",
              "DSCR < 1.0x يعني المشروع ما يقدر يسدد أقساطه — إفلاس تقني",
              "DSCR بين 1.0x و 1.2x: خطر — أي انخفاض بسيط يسبب تعثر"
            ]},
            { type: "heading", text: "المعادلة في النموذج" },
            { type: "text", text: "DSCR[y] = (الإيرادات[y] - إيجار الأرض[y]) ÷ خدمة الدين[y]. يُحسب فقط في السنوات اللي فيها خدمة دين (أقساط > 0)." },
            { type: "heading", text: "الحدود المطلوبة في السعودية" },
            { type: "list", items: [
              "الحد الأدنى المقبول: 1.2x (معظم البنوك السعودية)",
              "مريح: 1.5x وأكثر",
              "ممتاز: 2.0x+",
              "البنك قد يشترط DSCR أدنى كـ covenant (شرط تعاقدي)",
              "لو نزل تحت الحد: البنك يقدر يمنع توزيعات أو يطلب سداد مبكر"
            ]},
            { type: "heading", text: "كيف ترفع DSCR؟" },
            { type: "list", items: [
              "زيادة الإيرادات: إشغال أعلى، إيجارات أعلى",
              "تقليل خدمة الدين: تمويل أقل (LTV أقل)، فترة سداد أطول",
              "خفض المصاريف التشغيلية: تحسين كفاءة التشغيل",
              "الحوافز الحكومية: دعم الفائدة يقلل خدمة الدين مباشرة"
            ]}
          ]
        },
        {
          id: "leverage",
          label: "الرافعة المالية",
          icon: "⚖",
          content: [
            { type: "heading", text: "ما هي الرافعة المالية (Leverage)؟" },
            { type: "text", text: "استخدام أموال البنك (دين) لتمويل جزء من المشروع. الفكرة: لو عائد المشروع أعلى من تكلفة الدين، الفرق يذهب كاملاً لصاحب رأس المال." },
            { type: "heading", text: "مثال عملي" },
            { type: "list", items: [
              "مشروع 100M يحقق 15% عائد = 15M ربح",
              "بدون رافعة: استثمرت 100M، عائد 15M = 15% على رأس المال",
              "مع رافعة 70%: استثمرت 30M فقط، البنك 70M بتكلفة 7% = 4.9M",
              "ربحك = 15M - 4.9M = 10.1M على 30M = 33.7% على رأس المال!",
              "الرافعة حولت 15% إلى 33.7% — أكثر من ضعف العائد"
            ]},
            { type: "heading", text: "LTV (نسبة القرض للقيمة)" },
            { type: "list", items: [
              "LTV = حجم الدين ÷ قيمة المشروع",
              "LTV 70% = البنك يموّل 70% والمطور 30%",
              "في السعودية: 50%-70% هو المعتاد للتطوير العقاري",
              "LTV أعلى = رافعة أكبر = عائد أعلى + مخاطرة أعلى",
              "بعض البرامج الحكومية تسمح بـ LTV أعلى (80%-100%)"
            ]},
            { type: "heading", text: "Unlevered vs Levered في النموذج" },
            { type: "list", items: [
              "صافي التدفق غير الممول (Unlevered): إيرادات - إيجار أرض - CAPEX",
              "صافي التدفق الممول (Levered): Unlevered - خدمة الدين + عائدات التخارج",
              "Unlevered IRR = جودة المشروع نفسه (ما علاقته بالتمويل)",
              "Levered IRR = العائد الفعلي على رأس مال المطور/المستثمر"
            ]},
            { type: "heading", text: "متى تكون الرافعة سلبية؟" },
            { type: "list", items: [
              "لو تكلفة الدين أعلى من عائد المشروع",
              "مثال: مشروع عائده 6% وتكلفة الدين 7% = الرافعة تقلل العائد",
              "في هذه الحالة Levered IRR < Unlevered IRR (إشارة خطر)",
              "لذلك: لا تفترض دائماً أن الدين يحسّن العائد"
            ]}
          ]
        }
      ]
    },
    en: {
      title: "Core Financial Metrics",
      intro: "These metrics are the common language between developers, banks, and investors. Understanding them is essential for evaluating any real estate project.",
      cta: "Got it",
      tabs: [
        {
          id: "irr",
          label: "IRR",
          icon: "📈",
          content: [
            { type: "heading", text: "What is IRR (Internal Rate of Return)?" },
            { type: "text", text: "The annual percentage rate that makes the NPV of all cash flows equal to zero. Simply: the actual annualized return the project delivers." },
            { type: "heading", text: "Why IRR matters" },
            { type: "list", items: [
              "First metric any investor or bank asks for",
              "Accounts for timing of cash flows (money today > money tomorrow)",
              "Allows comparison across projects of different sizes and durations",
              "Higher IRR = project returns money faster with greater yield"
            ]},
            { type: "heading", text: "Unlevered IRR vs Levered IRR" },
            { type: "list", items: [
              "Unlevered (pre-financing): project return with no debt. Reflects pure project quality",
              "Levered (post-financing): return after debt service. Reflects actual return on equity",
              "Usually Levered > Unlevered due to leverage (if project is successful)",
              "If Levered < Unlevered: debt cost is destroying returns (negative leverage)"
            ]},
            { type: "heading", text: "Saudi market ranges" },
            { type: "list", items: [
              "Successful commercial project: Unlevered 12%-18%",
              "RE Fund (LP): 15%-25%",
              "Hospitality/tourism: 10%-20% (higher risk)",
              "Below 8% usually not attractive to investors"
            ]},
            { type: "heading", text: "IRR limitations" },
            { type: "list", items: [
              "Doesn't reflect absolute profit size",
              "Assumes reinvestment at same rate (may not be realistic)",
              "Very sensitive to cash flow timing",
              "Use together with NPV and MOIC, never alone"
            ]}
          ]
        },
        {
          id: "npv",
          label: "NPV",
          icon: "💵",
          content: [
            { type: "heading", text: "What is NPV (Net Present Value)?" },
            { type: "text", text: "Sum of all future cash flows discounted to today's value. If NPV > 0, the project earns more than the discount rate." },
            { type: "heading", text: "Why calculate NPV at 10%, 12%, and 14%?" },
            { type: "list", items: [
              "Each discount rate represents a different cost of capital expectation",
              "10%: conservative cost of capital — NPV > 0 means project exceeds minimum threshold",
              "12%: mid-range required return — most common benchmark in Saudi market",
              "14%: high required return — reflects higher risk or demanding investors",
              "NPV positive at 14%: excellent project even at highest expectations",
              "NPV negative at 10%: project fails minimum threshold"
            ]},
            { type: "heading", text: "How to read NPV" },
            { type: "list", items: [
              "NPV > 0: project creates value above discount rate",
              "NPV = 0: project earns exactly the discount rate (IRR = discount rate)",
              "NPV < 0: project destroys value vs alternative investment",
              "NPV measured in SAR — gives you the size of value created, not just percentage"
            ]},
            { type: "heading", text: "NPV vs IRR" },
            { type: "list", items: [
              "IRR gives percentage (%) — NPV gives amount (SAR)",
              "IRR better for comparing projects — NPV better for single investment decisions",
              "Two projects with same IRR can have very different NPV (different scales)",
              "Rule: use both together. Never rely on one metric alone"
            ]}
          ]
        },
        {
          id: "moic",
          label: "MOIC",
          icon: "✖",
          content: [
            { type: "heading", text: "What is MOIC (Multiple on Invested Capital)?" },
            { type: "text", text: "How many times the investor multiplied their money. MOIC = Total Distributions / Capital Invested. MOIC of 2.5x means SAR 2.50 received for every SAR 1 invested." },
            { type: "heading", text: "Paid-In vs Committed MOIC" },
            { type: "list", items: [
              "Paid-In: distributions / actual cash contributed (equity calls)",
              "Committed: distributions / originally committed equity",
              "Paid-In is higher because actual calls may be less than commitment",
              "Committed is the more common standard in fund reporting"
            ]},
            { type: "heading", text: "Why MOIC matters alongside IRR" },
            { type: "list", items: [
              "High IRR + low MOIC = fast but small return",
              "Low IRR + high MOIC = slow but large return",
              "Institutional investors typically target IRR > 15% with MOIC > 2x minimum",
              "In funds: GP focuses on IRR (performance), LP focuses on MOIC (actual profit)"
            ]}
          ]
        },
        {
          id: "dscr",
          label: "DSCR",
          icon: "🏦",
          content: [
            { type: "heading", text: "What is DSCR (Debt Service Coverage Ratio)?" },
            { type: "text", text: "How many times project income covers bank payments. DSCR = NOI / Debt Service. DSCR of 1.5x means income covers payments 1.5 times." },
            { type: "heading", text: "Why banks care about DSCR" },
            { type: "list", items: [
              "Primary metric determining loan approval",
              "Measures project's ability to service debt from operations",
              "DSCR < 1.0x means project cannot pay its obligations — technical default",
              "Between 1.0x-1.2x: danger zone — any dip causes default"
            ]},
            { type: "heading", text: "Saudi bank requirements" },
            { type: "list", items: [
              "Minimum acceptable: 1.2x (most Saudi banks)",
              "Comfortable: 1.5x+",
              "Excellent: 2.0x+",
              "Bank may set DSCR floor as covenant",
              "Below floor: bank can block distributions or demand early repayment"
            ]}
          ]
        },
        {
          id: "leverage",
          label: "Leverage",
          icon: "⚖",
          content: [
            { type: "heading", text: "What is Financial Leverage?" },
            { type: "text", text: "Using bank debt to finance part of the project. If project return exceeds debt cost, the difference goes entirely to equity holders, amplifying their return." },
            { type: "heading", text: "LTV (Loan-to-Value)" },
            { type: "list", items: [
              "LTV = Debt / Project Value",
              "LTV 70% = bank funds 70%, developer 30%",
              "Saudi standard: 50%-70% for RE development",
              "Higher LTV = more leverage = higher return + higher risk"
            ]},
            { type: "heading", text: "Unlevered vs Levered in the model" },
            { type: "list", items: [
              "Unlevered CF: income - land rent - CAPEX",
              "Levered CF: Unlevered - debt service + exit proceeds",
              "Unlevered IRR = pure project quality",
              "Levered IRR = actual return on equity invested"
            ]},
            { type: "heading", text: "When leverage is negative" },
            { type: "list", items: [
              "If debt cost exceeds project return",
              "Example: 6% project return with 7% debt cost = leverage reduces return",
              "Signal: Levered IRR < Unlevered IRR (red flag)"
            ]}
          ]
        }
      ]
    }
  },
  scenarioAnalysis: {
    ar: {
      title: "تحليل السيناريوهات - الدليل الكامل",
      intro: "تحليل السيناريوهات يجيب على سؤال واحد: ماذا لو؟ يختبر مرونة المشروع أمام التغيرات المحتملة قبل ما تحصل فعلياً.",
      cta: "فهمت",
      tabs: [
        {
          id: "what",
          label: "ما هو؟",
          icon: "📊",
          content: [
            { type: "heading", text: "ما هو تحليل السيناريوهات؟" },
            { type: "text", text: "أداة تختبر أداء المشروع المالي تحت ظروف مختلفة. بدل ما تعتمد على رقم واحد (الحالة الأساسية)، تشوف كيف تتغير النتائج لو تغيرت الافتراضات." },
            { type: "heading", text: "لماذا هو مهم؟" },
            { type: "list", items: [
              "البنك يطلبه قبل الموافقة على التمويل (اختبار إجهاد)",
              "المستثمر يبي يعرف أسوأ حالة قبل ما يستثمر",
              "المطور يحتاجه لتحديد المخاطر الحقيقية واتخاذ قرارات مدروسة",
              "يكشف ايش المتغيرات اللي تأثر أكثر على العائد (أيها أخطر)"
            ]},
            { type: "heading", text: "3 أدوات في هذه الصفحة" },
            { type: "list", items: [
              "مقارنة السيناريوهات: 8 سيناريوهات جاهزة جنب بعض. سريعة وواضحة",
              "جدول الحساسية: يغير متغيرين في نفس الوقت ويعرض الأثر في شبكة ملونة",
              "نقطة التعادل: يحسب الحد الأدنى لكل متغير قبل ما يخسر المشروع"
            ]}
          ]
        },
        {
          id: "scenarios",
          label: "الثمانية",
          icon: "🔢",
          content: [
            { type: "heading", text: "لماذا هذه السيناريوهات بالذات؟" },
            { type: "text", text: "هذه الثمانية تغطي أكثر المخاطر شيوعاً في التطوير العقاري السعودي. كل واحد يختبر متغير مختلف:" },
            { type: "heading", text: "CAPEX +10% (زيادة التكاليف)" },
            { type: "list", items: [
              "ايش يختبر: تكاليف البناء ارتفعت 10% عن المتوقع",
              "متى يحصل: ارتفاع أسعار مواد البناء، تغيير التصاميم، أو ظروف موقع غير متوقعة",
              "الأثر: يقلل IRR ويزيد رأس المال المطلوب",
              "في السعودية: شائع مع ارتفاع أسعار الحديد والخرسانة في فترات الطلب العالي"
            ]},
            { type: "heading", text: "CAPEX -10% (انخفاض التكاليف)" },
            { type: "list", items: [
              "ايش يختبر: التكاليف أقل من المتوقع (تفاوض جيد أو سوق مواد منخفض)",
              "الأثر: يرفع IRR ويقلل الدين المطلوب",
              "مهم لأنه يوضح حجم تأثير التكاليف على الجدوى"
            ]},
            { type: "heading", text: "Rent +10% / -10% (تغير الإيجارات)" },
            { type: "list", items: [
              "ايش يختبر: الإيرادات أعلى أو أقل من المتوقع",
              "متى يحصل: تغير العرض والطلب في السوق، دخول منافسين، تحسن الموقع",
              "الأثر: يؤثر على كامل فترة المشروع (ليس سنة واحدة)",
              "-10% هو اختبار الإجهاد الأهم — لو المشروع ينجح مع إيجارات أقل 10%، فيه هامش أمان"
            ]},
            { type: "heading", text: "Delay +6 months (تأخير البناء)" },
            { type: "list", items: [
              "ايش يختبر: البناء يتأخر 6 أشهر عن الجدول",
              "متى يحصل: مشاكل تصاريح، تأخر مقاول، ظروف طقس",
              "الأثر: يؤخر الإيرادات 6 أشهر لكن التكاليف الثابتة (إيجار أرض، فوائد) تستمر",
              "يقلل IRR بشكل كبير لأن التوقيت مهم جداً في حسابات العائد"
            ]},
            { type: "heading", text: "Esc +0.5% / -0.5% (تغير التصاعد)" },
            { type: "list", items: [
              "ايش يختبر: الزيادة السنوية في الإيجارات أعلى أو أقل بنصف نقطة",
              "الأثر: يبدو صغير لكنه يتراكم على 20-50 سنة (أثر تراكمي ضخم)",
              "+0.5% على 30 سنة ممكن يزيد إجمالي الإيرادات 15-25%",
              "مهم جداً لمشاريع الاحتفاظ طويلة المدة (Hold strategy)"
            ]}
          ]
        },
        {
          id: "read",
          label: "كيف تقرأ",
          icon: "👁",
          content: [
            { type: "heading", text: "كيف تقرأ جدول المقارنة" },
            { type: "list", items: [
              "العمود الأول (أزرق): الحالة الأساسية — هذا المرجع",
              "أخضر: أفضل من الحالة الأساسية",
              "أحمر: أسوأ من الحالة الأساسية",
              "قارن الفرق: كم تغير IRR أو NPV من الحالة الأساسية؟"
            ]},
            { type: "heading", text: "ايش أول شي تشوفه؟" },
            { type: "list", items: [
              "سطر Unlevered IRR: هل يبقى فوق 10% في أسوأ حالة؟",
              "سطر NPV @10%: هل يبقى موجب في كل السيناريوهات؟",
              "لو NPV سالب في أي سيناريو: المشروع حساس لهذا المتغير",
              "لو Levered IRR ينزل تحت 8%: البنك قد يرفض التمويل"
            ]},
            { type: "heading", text: "مثال عملي" },
            { type: "text", text: "IRR الأساسي 15%. في سيناريو CAPEX +10% نزل لـ 12%. في Rent -10% نزل لـ 9%. هذا يعني: المشروع حساس للإيرادات أكثر من التكاليف. لازم تركز على تأمين عقود إيجار قبل البناء." },
            { type: "heading", text: "كيف تقرأ جدول الحساسية" },
            { type: "list", items: [
              "كل خلية = نتيجة تغيير متغيرين في نفس الوقت",
              "الخلية الزرقاء = الحالة الأساسية (بدون تغيير)",
              "أخضر = IRR فوق 15% (ممتاز) أو NPV موجب",
              "أصفر = IRR بين 10%-15% (مقبول)",
              "أحمر = IRR تحت 0% أو NPV سالب (خطر)",
              "الزاوية العليا اليسرى = أسوأ حالة (المتغيرين سلبيين)",
              "الزاوية السفلى اليمنى = أفضل حالة (المتغيرين إيجابيين)"
            ]},
            { type: "heading", text: "كيف تقرأ نقطة التعادل" },
            { type: "list", items: [
              "نقطة تعادل الإشغال 60% يعني: المشروع يربح حتى لو 40% من المساحة فاضية",
              "تحمل انخفاض الإيجار -25% يعني: الإيجارات ممكن تنزل ربع وما يخسر",
              "تحمل زيادة تكاليف +20% يعني: التكاليف ممكن تزيد 20% وما يخسر",
              "القاعدة: هامش أمان فوق 30% = مريح. تحت 15% = خطر"
            ]}
          ]
        },
        {
          id: "bank",
          label: "للبنك",
          icon: "🏦",
          content: [
            { type: "heading", text: "ايش يبي البنك يشوف؟" },
            { type: "text", text: "البنك يستخدم تحليل السيناريوهات كـ 'اختبار إجهاد' (Stress Test). يبي يتأكد إن المشروع يقدر يسدد القرض حتى في أسوأ الظروف." },
            { type: "heading", text: "اختبارات البنك النموذجية" },
            { type: "list", items: [
              "DSCR في سيناريو Rent -10%: هل يبقى فوق 1.2x؟",
              "DSCR في سيناريو Delay +6mo: هل التأخير يكسر covenant؟",
              "NPV في أسوأ حالة: هل المشروع يبقى مجدي؟",
              "Combined stress: ماذا لو CAPEX +10% مع Rent -10% معاً؟"
            ]},
            { type: "heading", text: "كيف تجهز عرض البنك" },
            { type: "list", items: [
              "اعرض الحالة الأساسية أولاً مع IRR و DSCR",
              "ثم اعرض أسوأ حالتين وبيّن أن المشروع يتحمل",
              "أبرز هامش الأمان: الفرق بين الأداء الحالي ونقطة التعادل",
              "لو المشروع يتحمل Rent -15% وما زال DSCR > 1.2x: هذا قوي",
              "استخدم جدول الحساسية لإظهار نطاق واسع من الاحتمالات"
            ]},
            { type: "heading", text: "نصائح عملية" },
            { type: "list", items: [
              "لا تعرض سيناريوهات إيجابية فقط — البنك يفقد الثقة",
              "كن صريح مع المخاطر وبيّن كيف تعالجها",
              "فلتر حسب المرحلة لو عندك مشروع متعدد المراحل — البنك يموّل مرحلة مرحلة",
              "تقرير البنك في تبويب التقارير يسحب هذه البيانات تلقائياً"
            ]}
          ]
        }
      ]
    },
    en: {
      title: "Scenario Analysis - Complete Guide",
      intro: "Scenario analysis answers one question: What if? It tests project resilience against potential changes before they happen.",
      cta: "Got it",
      tabs: [
        {
          id: "what",
          label: "What is it?",
          icon: "📊",
          content: [
            { type: "heading", text: "What is Scenario Analysis?" },
            { type: "text", text: "A tool that tests financial performance under different conditions. Instead of relying on a single number (base case), you see how results change when assumptions change." },
            { type: "heading", text: "Why it matters" },
            { type: "list", items: [
              "Banks require it before loan approval (stress testing)",
              "Investors want to see downside before committing",
              "Developers need it to identify real risks and make informed decisions",
              "Reveals which variables impact returns the most (which are most dangerous)"
            ]},
            { type: "heading", text: "3 tools on this page" },
            { type: "list", items: [
              "Scenario Comparison: 8 built-in scenarios side by side. Quick and clear",
              "Sensitivity Table: changes 2 variables simultaneously in a color-coded grid",
              "Break-Even: calculates the minimum threshold for each variable"
            ]}
          ]
        },
        {
          id: "scenarios",
          label: "The Eight",
          icon: "🔢",
          content: [
            { type: "heading", text: "Why these 8 scenarios?" },
            { type: "text", text: "They cover the most common risks in Saudi RE development. Each tests a different variable:" },
            { type: "heading", text: "CAPEX +10% / -10%" },
            { type: "list", items: [
              "Tests: construction costs higher/lower than expected",
              "When it happens: material price changes, design changes, site conditions",
              "Impact: directly affects IRR and capital requirements",
              "Common in Saudi during high-demand periods (steel/concrete price surges)"
            ]},
            { type: "heading", text: "Rent +10% / -10%" },
            { type: "list", items: [
              "Tests: revenue higher/lower than projected",
              "Impact: affects entire project duration, not just one year",
              "-10% is the most important stress test — if project survives with 10% less rent, there's safety margin"
            ]},
            { type: "heading", text: "Delay +6 months" },
            { type: "list", items: [
              "Tests: construction delayed by 6 months",
              "Impact: delays revenue while fixed costs (land rent, interest) continue",
              "Reduces IRR significantly because timing matters greatly in return calculations"
            ]},
            { type: "heading", text: "Escalation +/-0.5%" },
            { type: "list", items: [
              "Tests: annual rent growth higher/lower by 0.5 percentage points",
              "Seems small but compounds over 20-50 years (massive cumulative effect)",
              "+0.5% over 30 years can increase total revenue 15-25%"
            ]}
          ]
        },
        {
          id: "read",
          label: "How to read",
          icon: "👁",
          content: [
            { type: "heading", text: "Reading the comparison table" },
            { type: "list", items: [
              "First column (blue): Base Case — this is your reference",
              "Green: better than base case",
              "Red: worse than base case",
              "Check: does IRR stay above 10% in worst case? Does NPV stay positive?"
            ]},
            { type: "heading", text: "Reading the sensitivity table" },
            { type: "list", items: [
              "Each cell = result of changing 2 variables simultaneously",
              "Blue cell = base case (no change)",
              "Green = IRR above 15% or NPV positive",
              "Red = IRR below 0% or NPV negative",
              "Top-left corner = worst case. Bottom-right = best case"
            ]},
            { type: "heading", text: "Reading break-even" },
            { type: "list", items: [
              "Occupancy break-even 60% means: project profits even with 40% vacancy",
              "Rent tolerance -25% means: rents can drop 25% without losing money",
              "Rule: safety margin above 30% = comfortable. Below 15% = risky"
            ]}
          ]
        },
        {
          id: "bank",
          label: "For banks",
          icon: "🏦",
          content: [
            { type: "heading", text: "What banks want to see" },
            { type: "text", text: "Banks use scenario analysis as stress testing. They want to confirm the project can service debt even under adverse conditions." },
            { type: "heading", text: "Typical bank stress tests" },
            { type: "list", items: [
              "DSCR in Rent -10% scenario: stays above 1.2x?",
              "DSCR in Delay +6mo: does delay break the covenant?",
              "Combined stress: what if CAPEX +10% AND Rent -10% together?",
              "NPV in worst case: does project remain viable?"
            ]},
            { type: "heading", text: "Preparing a bank presentation" },
            { type: "list", items: [
              "Show base case first with IRR and DSCR",
              "Then show 2 worst cases and prove project survives",
              "Highlight safety margins: gap between current and break-even",
              "Don't show only positive scenarios — banks lose trust",
              "Use sensitivity table to show a wide range of outcomes"
            ]}
          ]
        }
      ]
    }
  },
  // Future: revenueTypes
  projectTypes: {
    ar: {
      title: "أنواع المشاريع العقارية",
      intro: "كل نوع مشروع له نموذج إيرادات مختلف وطريقة حساب مختلفة في النموذج المالي. فهم الفرق أساسي قبل بناء النموذج.",
      cta: "فهمت",
      tabs: [
        { id: "residential", label: "سكني", icon: "🏘", content: [
          { type: "heading", text: "المشاريع السكنية (إيجار)" },
          { type: "text", text: "مجمعات سكنية، أبراج، فلل - الإيراد من الإيجار الشهري/السنوي للوحدات." },
          { type: "heading", text: "المدخلات الأساسية" },
          { type: "list", items: ["سعر الإيجار لكل متر مربع (SAR/sqm/year)", "نسبة الإشغال المستهدفة (عادة 85-95%)", "فترة التأجير التدريجي (Ramp-up) - عادة 2-3 سنوات", "نسبة الكفاءة (المساحة المؤجرة من GFA) - عادة 80-90%", "معدل زيادة الإيجار السنوي (0.5-2%)"] },
          { type: "heading", text: "أرقام مرجعية - السوق السعودي" },
          { type: "list", items: ["إيجار الشقق (الرياض): 600-1,200 SAR/sqm/سنة", "إيجار الفلل (الرياض): 400-800 SAR/sqm/سنة", "نسبة الشغور الطبيعية: 5-15%", "تكلفة البناء: 2,500-3,500 SAR/sqm"] },
          { type: "heading", text: "نصائح للنمذجة" },
          { type: "list", items: ["ابدأ بإشغال منخفض في السنوات الأولى ثم ارفعه تدريجياً", "احسب مصاريف الصيانة (عادة 5-8% من الإيرادات)", "لا تنسَ فترة البناء - لا إيرادات خلالها"] }
        ]},
        { id: "commercial", label: "تجاري", icon: "🏢", content: [
          { type: "heading", text: "المشاريع التجارية (مولات ومكاتب)" },
          { type: "text", text: "مراكز تسوق، أبراج مكتبية - الإيراد من إيجار المساحات التجارية. عادة أعلى إيجار من السكني لكن أبطأ في التأجير." },
          { type: "heading", text: "الفرق عن السكني" },
          { type: "list", items: ["إيجارات أعلى (1,500-3,000 SAR/sqm لمولات رئيسية)", "فترة تأجير أطول (3-5 سنوات لملء المول)", "عقود إيجار أطول (5-10 سنوات) توفر استقرار", "مساهمة المستأجر في التجهيز (Fit-out Contribution) شائعة", "بعض المولات تأخذ نسبة من مبيعات المستأجر (Turnover Rent)"] },
          { type: "heading", text: "تصنيف المكاتب" },
          { type: "list", items: ["Grade A: 900-1,500 SAR/sqm - أبراج رئيسية (KAFD, العليا)", "Grade B: 500-900 SAR/sqm - مباني جيدة في مواقع ثانوية", "Grade C: 300-500 SAR/sqm - مباني قديمة أو مواقع بعيدة"] }
        ]},
        { id: "hospitality", label: "فندقي", icon: "🏨", content: [
          { type: "heading", text: "المشاريع الفندقية" },
          { type: "text", text: "فنادق ومنتجعات - النموذج الأكثر تعقيداً لأنه يتضمن قائمة أرباح وخسائر تشغيلية كاملة (P&L)." },
          { type: "heading", text: "مكونات الإيرادات" },
          { type: "list", items: ["إيرادات الغرف (عادة 65-75% من الإجمالي): عدد الغرف × ADR × الإشغال × 365", "المأكولات والمشروبات F&B (عادة 18-25%)", "المؤتمرات MICE (عادة 3-5%)", "إيرادات أخرى (سبا، مواقف، غسيل) - عادة 2-5%"] },
          { type: "heading", text: "المصاريف التشغيلية" },
          { type: "list", items: ["مصاريف الغرف: 20-25% من إيرادات الغرف", "مصاريف F&B: 55-65% من إيرادات F&B", "المصاريف غير الموزعة: 25-30% من الإيرادات", "المصاريف الثابتة: 8-12% من الإيرادات", "رسوم الإدارة: 3-5% من الإيرادات + حوافز"] },
          { type: "heading", text: "أرقام مرجعية - السعودية" },
          { type: "list", items: ["ADR فندق 5 نجوم (الرياض): 800-1,500 SAR", "ADR فندق 4 نجوم: 400-700 SAR", "إشغال مستقر: 65-75%", "تكلفة بناء فندق 5 نجوم: 10,000-15,000 SAR/sqm", "هامش EBITDA: 30-40% من الإيرادات"] }
        ]},
        { id: "mixeduse", label: "متعدد الاستخدامات", icon: "🌊", content: [
          { type: "heading", text: "المشاريع متعددة الاستخدامات (Mixed-Use)" },
          { type: "text", text: "تجمع عدة أنواع أصول في مشروع واحد - مثل الواجهة البحرية: مول + فندق + مكاتب + سكني + مارينا. كل مكون يُنمذج بشكل مستقل ثم يُجمع." },
          { type: "heading", text: "لماذا المشاريع المختلطة؟" },
          { type: "list", items: ["تنويع مصادر الدخل يقلل المخاطر", "المكونات تدعم بعضها (الفندق يخدم المول والمارينا)", "أفضل استغلال للأرض وتعظيم العائد", "جاذبية أعلى للمستثمرين والبنوك"] },
          { type: "heading", text: "كيف تُنمذج في المنصة" },
          { type: "list", items: ["كل أصل (Asset) يُضاف كصف مستقل في جدول الأصول", "كل أصل ينتمي لمرحلة (Phase) محددة", "المحرك يحسب CAPEX والإيرادات لكل أصل على حدة", "التدفق النقدي يُجمع على مستوى المرحلة ثم المشروع ككل", "مثال: الواجهة البحرية = 6 أصول × مرحلتين = 12 حساب مستقل"] }
        ]}
      ]
    },
    en: {
      title: "Real Estate Project Types",
      intro: "Each project type has a different revenue model and calculation method. Understanding these differences is essential before building a financial model.",
      cta: "Got it",
      tabs: [
        { id: "residential", label: "Residential", icon: "🏘", content: [
          { type: "heading", text: "Residential Projects (Rental)" },
          { type: "text", text: "Compounds, towers, villas - revenue from monthly/annual unit rentals." },
          { type: "heading", text: "Key Inputs" },
          { type: "list", items: ["Rent per sqm (SAR/sqm/year)", "Target occupancy (typically 85-95%)", "Ramp-up period - usually 2-3 years", "Efficiency ratio (leasable area from GFA) - typically 80-90%", "Annual rent escalation (0.5-2%)"] },
          { type: "heading", text: "Saudi Market Benchmarks" },
          { type: "list", items: ["Apartment rent (Riyadh): 600-1,200 SAR/sqm/year", "Villa rent (Riyadh): 400-800 SAR/sqm/year", "Natural vacancy: 5-15%", "Construction cost: 2,500-3,500 SAR/sqm"] },
          { type: "heading", text: "Modeling Tips" },
          { type: "list", items: ["Start with low occupancy in early years, ramp up gradually", "Factor in maintenance costs (typically 5-8% of revenue)", "Remember: no revenue during construction period"] }
        ]},
        { id: "commercial", label: "Commercial", icon: "🏢", content: [
          { type: "heading", text: "Commercial Projects (Malls & Offices)" },
          { type: "text", text: "Shopping centers, office towers - revenue from commercial space leasing. Typically higher rents than residential but slower to fill." },
          { type: "heading", text: "Differences from Residential" },
          { type: "list", items: ["Higher rents (1,500-3,000 SAR/sqm for prime malls)", "Longer lease-up period (3-5 years to fill a mall)", "Longer lease terms (5-10 years) provide stability", "Tenant fit-out contributions are common", "Some malls take turnover rent (% of tenant sales)"] },
          { type: "heading", text: "Office Classification" },
          { type: "list", items: ["Grade A: 900-1,500 SAR/sqm - prime towers (KAFD, Olaya)", "Grade B: 500-900 SAR/sqm - good buildings in secondary locations", "Grade C: 300-500 SAR/sqm - older buildings or distant locations"] }
        ]},
        { id: "hospitality", label: "Hospitality", icon: "🏨", content: [
          { type: "heading", text: "Hospitality Projects" },
          { type: "text", text: "Hotels and resorts - the most complex model type because it includes a full operating P&L statement." },
          { type: "heading", text: "Revenue Components" },
          { type: "list", items: ["Room revenue (usually 65-75% of total): Keys × ADR × Occupancy × 365", "F&B revenue (usually 18-25%)", "MICE/conferences (usually 3-5%)", "Other revenue (spa, parking, laundry) - usually 2-5%"] },
          { type: "heading", text: "Operating Expenses" },
          { type: "list", items: ["Room expenses: 20-25% of room revenue", "F&B expenses: 55-65% of F&B revenue", "Undistributed expenses: 25-30% of revenue", "Fixed charges: 8-12% of revenue", "Management fees: 3-5% of revenue + incentives"] },
          { type: "heading", text: "Saudi Benchmarks" },
          { type: "list", items: ["5-star ADR (Riyadh): 800-1,500 SAR", "4-star ADR: 400-700 SAR", "Stabilized occupancy: 65-75%", "5-star construction cost: 10,000-15,000 SAR/sqm", "EBITDA margin: 30-40% of revenue"] }
        ]},
        { id: "mixeduse", label: "Mixed-Use", icon: "🌊", content: [
          { type: "heading", text: "Mixed-Use Projects" },
          { type: "text", text: "Multiple asset types in one project - like Haseef Waterfront: mall + hotel + offices + residential + marina. Each component is modeled independently then consolidated." },
          { type: "heading", text: "Why Mixed-Use?" },
          { type: "list", items: ["Revenue diversification reduces risk", "Components support each other (hotel serves mall and marina)", "Better land utilization and return maximization", "Higher attractiveness for investors and banks"] },
          { type: "heading", text: "How to Model in the Platform" },
          { type: "list", items: ["Each asset is added as a separate row in the Asset Table", "Each asset belongs to a specific Phase", "Engine calculates CAPEX and revenue per asset independently", "Cash flow is consolidated at phase then project level", "Example: Haseef Waterfront = 6 assets × 2 phases = 12 independent calculations"] }
        ]}
      ]
    }
  },
  bankPack: {
    ar: {
      title: "حزمة تقديم البنك",
      intro: "البنك يحتاج حزمة مستندات مالية محددة قبل الموافقة على التمويل. فهم ما يبحث عنه البنك يساعدك في تجهيز طلب أقوى.",
      cta: "فهمت",
      tabs: [
        { id: "overview", label: "نظرة عامة", icon: "🏦", content: [
          { type: "heading", text: "ما هي حزمة البنك؟" },
          { type: "text", text: "مجموعة مستندات مالية يطلبها البنك لدراسة طلب التمويل. تشمل دراسة المشروع، طلب التمويل، النطاق المالي، والتدفقات النقدية." },
          { type: "heading", text: "المكونات الرئيسية" },
          { type: "list", items: ["1. دراسة المشروع (Project Study): وصف المشروع، الموقع، المكونات، الجدول الزمني", "2. طلب التمويل (Financing Request): المبلغ المطلوب، الشروط المقترحة، الضمانات", "3. النطاق المالي (Financial Scope): إجمالي التكاليف، مصادر التمويل، هيكل رأس المال", "4. التدفقات النقدية (Cash Flow): 10+ سنوات توقعات إيرادات ومصاريف وخدمة دين"] },
          { type: "heading", text: "أول شيء يبحث عنه البنك" },
          { type: "list", items: ["DSCR - نسبة تغطية خدمة الدين (يجب > 1.2x)", "LTV - نسبة القرض إلى القيمة (عادة لا تتجاوز 70%)", "مساهمة المطور - البنك يريد skin in the game", "ضمانات عينية (رهن عقاري) أو كفالات شخصية", "سجل المطور السابق في مشاريع مماثلة"] }
        ]},
        { id: "dscr", label: "DSCR", icon: "📊", content: [
          { type: "heading", text: "نسبة تغطية خدمة الدين (DSCR)" },
          { type: "text", text: "أهم رقم في حزمة البنك. يقيس قدرة المشروع على سداد أقساط القرض من دخله التشغيلي." },
          { type: "heading", text: "كيف تُحسب؟" },
          { type: "text", text: "DSCR = صافي الدخل التشغيلي (NOI) ÷ خدمة الدين السنوية (أصل + ربح)" },
          { type: "heading", text: "ماذا تعني الأرقام؟" },
          { type: "list", items: ["أقل من 1.0x: المشروع لا يغطي أقساطه - مرفوض", "1.0x - 1.2x: يغطي بالكاد - خطر عالي", "1.2x - 1.5x: مقبول لمعظم البنوك السعودية", "1.5x - 2.0x: مريح - شروط أفضل ممكنة", "أكثر من 2.0x: ممتاز - أقل معدل ربح وأقل ضمانات"] },
          { type: "heading", text: "متطلبات البنوك السعودية" },
          { type: "list", items: ["الحد الأدنى عادة 1.2x (بعض البنوك 1.25x)", "البنك قد يشترط الحفاظ على DSCR طوال فترة القرض", "كسر DSCR covenant يعطي البنك حق تسريع السداد", "البنك يختبر DSCR تحت سيناريوهات ضغط (إشغال -10%, إيجار -15%)"] }
        ]},
        { id: "presentation", label: "كيف تقدم", icon: "📋", content: [
          { type: "heading", text: "نصائح لتقديم حزمة بنك ناجحة" },
          { type: "list", items: ["ابدأ بملخص تنفيذي من صفحة واحدة: المشروع، التكلفة، المبلغ المطلوب، DSCR", "قدّم 3 سيناريوهات: أساسي + متفائل + متشائم - أثبت أن المشروع ينجو حتى في الأسوأ", "استخدم جداول حساسية: وضّح كيف يتغير DSCR مع تغير الإشغال والإيجار", "أظهر خبرة المطور: مشاريع سابقة ناجحة تبني ثقة البنك", "كن واقعياً: لا تبالغ في الإشغال أو الإيجارات - البنك سيتحقق من السوق"] },
          { type: "heading", text: "أخطاء شائعة" },
          { type: "list", items: ["تقديم سيناريو واحد فقط (البنك يشك أنك تخفي المخاطر)", "إشغال 100% من السنة الأولى (غير واقعي)", "عدم احتساب فترة البناء بدون دخل", "نسيان رسوم ترتيب القرض وتكاليف التمويل", "عدم إظهار مصدر مساهمة المطور في رأس المال"] }
        ]}
      ]
    },
    en: {
      title: "Bank Submission Pack",
      intro: "Banks require a specific set of financial documents before approving financing. Understanding what banks look for helps you prepare a stronger application.",
      cta: "Got it",
      tabs: [
        { id: "overview", label: "Overview", icon: "🏦", content: [
          { type: "heading", text: "What is a Bank Pack?" },
          { type: "text", text: "A set of financial documents required by banks to evaluate financing requests. Includes project study, financing request, financial scope, and cash flow projections." },
          { type: "heading", text: "Key Components" },
          { type: "list", items: ["1. Project Study: project description, location, components, timeline", "2. Financing Request: amount needed, proposed terms, collateral", "3. Financial Scope: total costs, funding sources, capital structure", "4. Cash Flow: 10+ year projections of revenue, expenses, and debt service"] },
          { type: "heading", text: "What Banks Look For First" },
          { type: "list", items: ["DSCR - Debt Service Coverage Ratio (must be > 1.2x)", "LTV - Loan to Value ratio (typically max 70%)", "Developer contribution - banks want skin in the game", "Collateral (real estate mortgage) or personal guarantees", "Developer's track record in similar projects"] }
        ]},
        { id: "dscr", label: "DSCR Deep Dive", icon: "📊", content: [
          { type: "heading", text: "Debt Service Coverage Ratio (DSCR)" },
          { type: "text", text: "The most important number in a bank pack. Measures the project's ability to pay loan installments from operating income." },
          { type: "heading", text: "Formula" },
          { type: "text", text: "DSCR = Net Operating Income (NOI) ÷ Annual Debt Service (Principal + Profit)" },
          { type: "heading", text: "What the Numbers Mean" },
          { type: "list", items: ["Below 1.0x: Project can't cover payments - rejected", "1.0x - 1.2x: Barely covers - high risk", "1.2x - 1.5x: Acceptable for most Saudi banks", "1.5x - 2.0x: Comfortable - better terms possible", "Above 2.0x: Excellent - lowest rate and fewer covenants"] },
          { type: "heading", text: "Saudi Bank Requirements" },
          { type: "list", items: ["Minimum typically 1.2x (some banks require 1.25x)", "Bank may require maintaining DSCR throughout loan tenor", "Breaking DSCR covenant gives bank right to accelerate repayment", "Banks stress-test DSCR with adverse scenarios (occupancy -10%, rent -15%)"] }
        ]},
        { id: "presentation", label: "How to Present", icon: "📋", content: [
          { type: "heading", text: "Tips for a Successful Bank Submission" },
          { type: "list", items: ["Start with a one-page executive summary: project, cost, amount requested, DSCR", "Present 3 scenarios: base + optimistic + pessimistic - prove project survives the worst case", "Use sensitivity tables: show how DSCR changes with occupancy and rent variations", "Show developer experience: successful past projects build bank confidence", "Be realistic: don't inflate occupancy or rents - the bank will verify with market data"] },
          { type: "heading", text: "Common Mistakes" },
          { type: "list", items: ["Presenting only one scenario (bank suspects you're hiding risks)", "100% occupancy from Year 1 (unrealistic)", "Ignoring construction period with no income", "Forgetting loan arrangement fees and financing costs", "Not showing source of developer's equity contribution"] }
        ]}
      ]
    }
  },
  quickStart: {
    ar: {
      title: "دليل البداية السريعة",
      intro: "خطوات عملية لإنشاء أول نموذج مالي لك في أقل من 10 دقائق.",
      cta: "يلا نبدأ!",
      tabs: [
        { id: "step1", label: "الخطوة 1: المشروع", icon: "1️⃣", content: [
          { type: "heading", text: "أنشئ مشروع جديد" },
          { type: "list", items: ["اضغط \"+ مشروع جديد\" في صفحة المشاريع", "اختر قالب يناسب مشروعك (واجهة بحرية، سكني، تجاري، فندق) أو ابدأ فارغ", "سيفتح المعالج السريع (Quick Setup Wizard) - 4 خطوات سريعة"] },
          { type: "heading", text: "المعالج السريع يسألك عن:" },
          { type: "list", items: ["1. اسم المشروع والموقع", "2. نوع الأرض (إيجار أو شراء أو شراكة)", "3. آلية التمويل (ذاتي، بنكي، دين+ملكية، صندوق)", "4. استراتيجية التخارج (بيع، احتفاظ)"] },
          { type: "heading", text: "نصيحة" },
          { type: "text", text: "لا تقلق من الاختيارات - كل شيء قابل للتعديل لاحقاً من الشريط الجانبي." }
        ]},
        { id: "step2", label: "الخطوة 2: الأصول", icon: "2️⃣", content: [
          { type: "heading", text: "أضف أصولك" },
          { type: "text", text: "انتقل لتبويب \"الأصول\" وأضف المكونات الرئيسية لمشروعك." },
          { type: "heading", text: "لكل أصل، أدخل:" },
          { type: "list", items: ["المرحلة التي ينتمي لها", "التصنيف (سكني، تجاري، فندقي، مكاتب...)", "المساحات: مساحة الأرض، البصمة، GFA", "نوع الإيراد: إيجار أو تشغيل (للفنادق والمارينا)", "معدل الإيجار، الإشغال، فترة التأجير التدريجي", "تكلفة البناء (SAR/sqm) ومدة الإنشاء"] },
          { type: "heading", text: "نصيحة" },
          { type: "text", text: "ابدأ بأصل واحد فقط وتأكد أن الأرقام منطقية في لوحة التحكم قبل إضافة المزيد." }
        ]},
        { id: "step3", label: "الخطوة 3: النتائج", icon: "3️⃣", content: [
          { type: "heading", text: "اقرأ النتائج" },
          { type: "text", text: "فوراً بعد إضافة أصل واحد على الأقل، ستظهر النتائج في لوحة التحكم (Dashboard)." },
          { type: "heading", text: "أهم الأرقام التي تبحث عنها:" },
          { type: "list", items: ["إجمالي CAPEX: التكلفة الإجمالية للمشروع", "IRR: العائد الداخلي - هل المشروع مجدي؟ (أعلى من 10% عادة جيد)", "NPV: صافي القيمة الحالية - هل يضيف قيمة؟ (موجب = جيد)", "DSCR: تغطية الدين - هل يقدر يسدد القرض؟ (أعلى من 1.2x)"] },
          { type: "heading", text: "التبويبات المهمة" },
          { type: "list", items: ["التمويل: اضبط شروط القرض والصندوق", "حافز الأداء: شاهد توزيع الأرباح بين GP و LP", "السيناريوهات: قارن 8 سيناريوهات مختلفة", "الفحوصات: تأكد من عدم وجود أخطاء", "التقارير: صدّر حزمة البنك أو تقرير المستثمر"] }
        ]},
        { id: "tips", label: "نصائح ذهبية", icon: "💡", content: [
          { type: "heading", text: "نصائح من الممارسة" },
          { type: "list", items: ["ابدأ بالأبسط: مشروع واحد، أصل واحد، تمويل ذاتي - ثم عقّد تدريجياً", "استخدم القوالب الجاهزة: فيها أرقام واقعية من السوق السعودي", "تحقق من الفحوصات (Checks): إذا فيها تحذير، عالجه قبل ما تكمل", "جرّب السيناريوهات: غيّر الإيجار -10% وشوف هل المشروع لسا يشتغل", "قارن بين التمويل الذاتي والبنكي: شوف كيف الرافعة المالية تأثر على IRR"] },
          { type: "heading", text: "اختصارات لوحة المفاتيح" },
          { type: "list", items: ["Ctrl+Z: تراجع عن آخر تعديل (30 خطوة)", "مبدّل اللغة: عربي ↔ English في أي وقت", "وضع العرض (Present): لعرض النموذج على البنك أو المستثمر"] }
        ]}
      ]
    },
    en: {
      title: "Quick Start Guide",
      intro: "Practical steps to create your first financial model in under 10 minutes.",
      cta: "Let's go!",
      tabs: [
        { id: "step1", label: "Step 1: Project", icon: "1️⃣", content: [
          { type: "heading", text: "Create a New Project" },
          { type: "list", items: ["Click \"+ New Project\" on the Projects page", "Choose a template (waterfront, residential, commercial, hotel) or start blank", "The Quick Setup Wizard opens - 4 quick steps"] },
          { type: "heading", text: "The Wizard Asks About:" },
          { type: "list", items: ["1. Project name and location", "2. Land type (lease, purchase, or partnership)", "3. Financing mode (self-funded, bank, debt+equity, fund)", "4. Exit strategy (sell, hold)"] },
          { type: "heading", text: "Tip" },
          { type: "text", text: "Don't worry about choices - everything can be changed later from the sidebar." }
        ]},
        { id: "step2", label: "Step 2: Assets", icon: "2️⃣", content: [
          { type: "heading", text: "Add Your Assets" },
          { type: "text", text: "Go to the \"Assets\" tab and add your project's main components." },
          { type: "heading", text: "For Each Asset, Enter:" },
          { type: "list", items: ["Phase assignment", "Category (residential, commercial, hospitality, office...)", "Areas: plot area, footprint, GFA", "Revenue type: lease or operating (for hotels and marinas)", "Lease rate, occupancy, ramp-up period", "Construction cost (SAR/sqm) and duration"] },
          { type: "heading", text: "Tip" },
          { type: "text", text: "Start with just one asset and verify the numbers make sense on the Dashboard before adding more." }
        ]},
        { id: "step3", label: "Step 3: Results", icon: "3️⃣", content: [
          { type: "heading", text: "Read the Results" },
          { type: "text", text: "Immediately after adding at least one asset, results appear on the Dashboard." },
          { type: "heading", text: "Key Numbers to Look For:" },
          { type: "list", items: ["Total CAPEX: total project cost", "IRR: internal rate of return - is the project viable? (above 10% is usually good)", "NPV: net present value - does it add value? (positive = good)", "DSCR: debt coverage - can it repay the loan? (above 1.2x)"] },
          { type: "heading", text: "Important Tabs" },
          { type: "list", items: ["Financing: adjust loan and fund terms", "Waterfall: see profit distribution between GP and LP", "Scenarios: compare 8 different scenarios", "Checks: verify no errors exist", "Reports: export bank pack or investor report"] }
        ]},
        { id: "tips", label: "Pro Tips", icon: "💡", content: [
          { type: "heading", text: "Tips from Practice" },
          { type: "list", items: ["Start simple: one project, one asset, self-funded - then add complexity gradually", "Use ready templates: they contain realistic Saudi market numbers", "Check the Checks tab: if there's a warning, fix it before proceeding", "Try scenarios: reduce rent by -10% and see if the project still works", "Compare self-funded vs bank: see how leverage affects IRR"] },
          { type: "heading", text: "Keyboard Shortcuts" },
          { type: "list", items: ["Ctrl+Z: undo last change (30 steps)", "Language toggle: Arabic ↔ English anytime", "Present mode: for presenting to banks or investors"] }
        ]}
      ]
    }
  }
};
