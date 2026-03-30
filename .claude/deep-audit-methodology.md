# منهجية التدقيق العميق — Deep Audit Methodology

## المبدأ
لا نبحث عن أخطاء برمجية فقط. نبحث عن:
- أرقام تظهر للمستخدم وتبدو صحيحة لكنها خاطئة مالياً
- حسابات رياضية تعمل لكن منطقها المحاسبي غلط
- حالات يتصرف فيها النموذج بشكل مختلف عما يتوقعه محلل مالي

## الجولات

### الجولة 1: تدقيق الحسابات الأساسية (CAPEX + Revenue)
لكل أصل، تتبع:
- GFA × costPerSqm × (1+soft%) × (1+contingency%) = totalCapex ← تحقق بالآلة الحاسبة
- leasableArea = GFA × efficiency% ← هل efficiency محسوبة صح؟
- revenue = leasableArea × leaseRate × occ × rampUp × escalation ← تتبع سنة بسنة
- هل الـ ramp-up يبدأ بعد البناء فعلاً؟
- هل الـ escalation تراكمية (compound) أم بسيطة (step)?

### الجولة 2: تدقيق الدين (Debt Schedule)
- drawdown = capex × debtRatio ← هل debtRatio = min(maxDebt/devCost, 1)?
- فائدة = (رصيد_بداية + رصيد_نهاية) / 2 × rate ← أم رصيد_بداية × rate?
- سداد = مبلغ_متساوي لأمورتايزنق أم balloon في نهاية المدة?
- هل فترة السماح تبدأ من أول سحب أم من نهاية البناء?
- هل الـ balloon عند التخارج يسدد كامل الرصيد المتبقي?
- DSCR = NOI / DS ← هل NOI = Income - LandRent? أم Income - LandRent - Opex?

### الجولة 3: تدقيق التخارج (Exit Valuation)
- exitVal = income × multiple أم NOI × multiple?
- هل capRate exit = NOI / capRate أم income / capRate?
- هل تكاليف التخارج تُخصم صح (exitVal × exitCostPct)?
- هل الـ exit proceeds تشمل سداد الدين أم لا (gross vs net)?
- هل يتم صفر التدفقات بعد سنة التخارج?

### الجولة 4: تدقيق الشلال (Waterfall)
- cashAvail = unlevCF - DS - fees + unfundedFees + exit ← تتبع يدوياً
- Tier1 (ROC): هل يتم استرداد رأس المال أولاً؟
- Tier2 (Pref): هل الاستحقاق تراكمي (accrued) أم سنوي فقط?
- هل LP+GP distributions = cashAvail لكل سنة (conservation of cash)?
- هل MOIC = netDist / totalCalled (صح) أم totalDist / equity (خطأ)?
- هل IRR يُحسب من netCF (يشمل الاستدعاءات السالبة)?

### الجولة 5: تدقيق الرسوم (Fees)
- subscriptionFee = equity × pct ← على أي أساس (devCost, equity, nav)?
- managementFee = basis × pct ← ما هو الـ basis لكل نمط?
- developerFee = devCost × pct ← exclLand أم inclLand?
- هل الرسوم تُخصم من cashAvail (operational) أم من equity calls (capital)?
- هل feeTreatment يؤثر على ROC و Pref بشكل صحيح?

### الجولة 6: تدقيق المراحل المتعددة (Multi-Phase)
- هل كل مرحلة مستقلة فعلاً (لا تؤثر على غيرها)?
- هل التجميع (aggregation) يحفظ المجاميع (conservation)?
- هل DSCR المجمع = إجمالي NOI / إجمالي DS (وليس متوسط DSCRs)?
- هل الرسوم على أساس المرحلة أم المشروع الكامل?

### الجولة 7: تدقيق الحوافز (Incentives)
- هل منحة CAPEX تُطبق على التدفق أم على التكلفة?
- هل دعم الفائدة يُطبق على الفترة الصحيحة?
- هل خصم الإيجار يُطبق فقط خلال فترة البناء + التشغيل المحددة?
