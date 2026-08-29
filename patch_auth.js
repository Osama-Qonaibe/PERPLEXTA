const fs = require('fs');
let code = fs.readFileSync('server/routes/auth.ts', 'utf8');

// Replace pagePayload injection with a safer base64 encoding to avoid ALL JSON parsing/HTML escaping issues
code = code.replace(
  `const pagePayload = JSON.stringify({`,
  `const pagePayloadRaw = JSON.stringify({`
);
code = code.replace(
  `remember: rememberMe\n    });`,
  `remember: rememberMe\n    });\n    const pagePayload = Buffer.from(pagePayloadRaw).toString('base64');`
);

code = code.replace(
  `<script id="__auth_data__" type="application/json">\${pagePayload}</script>`,
  `<script id="__auth_data__" type="application/base64">\${pagePayload}</script>`
);

code = code.replace(
  `const data = JSON.parse(document.getElementById('__auth_data__').textContent);`,
  `const data = JSON.parse(atob(document.getElementById('__auth_data__').textContent));`
);

code = code.replace(
  `window.location.href = window.location.origin + safeRef + separator +`,
  `window.location.href = window.location.origin + safeRef + separator + 'oauth=1&' +`
);

code = code.replace(
  `console.error('Auth processing failed', err);\n                window.location.href = '/';`,
  `console.error('Auth processing failed', err);\n                document.body.innerHTML += '<div style="color:red; margin-top:20px;">Error: ' + err.message + '</div>';\n                if (!isPopup) { window.location.href = '/?oauth_error=1'; }`
);

fs.writeFileSync('server/routes/auth.ts', code);
