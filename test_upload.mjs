import fs from 'fs';
import path from 'path';

async function run() {
  const fileContent = Buffer.alloc(500 * 1024, 'a'); // 500KB of 'a's
  const { FormData } = await import('formdata-node');
  const { File } = await import('fetch-blob/file.js');
  
  const form = new FormData();
  form.append('file', new File([fileContent], 'test.png', { type: 'image/png' }));
  
  const jwt = await import('jsonwebtoken');
  const dotenv = await import('dotenv');
  dotenv.config();
  
  const token = jwt.default.sign(
    { id: 1, email: 'admin@admin.com', role: 'admin' },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );

  const fetch = (await import('node-fetch')).default;
  
  const res = await fetch('http://localhost:3000/api/admin/settings/upload-asset', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: form
  });
  
  console.log(res.status);
  console.log(await res.text());
}
run();
