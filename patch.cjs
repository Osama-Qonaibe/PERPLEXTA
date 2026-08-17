const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

if (!code.includes('const confirm = useConfirm();') || (code.match(/const confirm = useConfirm\(\);/g) || []).length < 4) {
    code = code.replace(/const \{ plans, setPlans, token, language, setIsOperationPending \} =\s*useAppContext\(\);/, "const confirm = useConfirm();\n  const { plans, setPlans, token, language, setIsOperationPending } = useAppContext();");
    fs.writeFileSync('src/pages/AdminDashboard.tsx', code, 'utf8');
    console.log("Success");
}
