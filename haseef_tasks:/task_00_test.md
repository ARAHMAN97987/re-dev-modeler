# TASK 0: Permission Test (مهمة تجريبية)

```bash
cd "/Users/abdulrahman/Desktop/السليمان /زان/00 Data Room ZAN/re-dev-modeler"
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

## المطلوب
هذه مهمة تجريبية فقط للتأكد من الأذونات. نفذ التالي:

1. `pwd` — تأكد إنك في المسار الصحيح
2. `node --version` — تأكد nvm شغال
3. `ls src/App.jsx` — تأكد الملف موجود
4. `wc -l src/App.jsx` — عدد الأسطر
5. `node tests/engine_audit.cjs 2>&1 | tail -5` — تشغيل الاختبارات
6. `node tests/zan_benchmark.cjs 2>&1 | tail -5` — تشغيل الاختبارات
7. `npm run build 2>&1 | tail -3` — تأكد البناء يشتغل
8. اكتب ملف `docs/test_task_report.md` فيه:
   - المسار ✓
   - Node version ✓
   - App.jsx lines: [العدد]
   - Tests: [النتيجة]
   - Build: [النتيجة]
   - Timestamp: [الوقت]

لا تعدل أي كود. فقط تحقق وسجل.
