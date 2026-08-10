import fs from 'fs';
import path from 'path';

async function run() {
  const fileContent = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  
  const FormData = (await import('formdata-node')).FormData;
  const { File } = await import('fetch-blob/file.js');
  
  const form = new FormData();
  form.append('file', new File([fileContent], 'test.png', { type: 'image/png' }));
  
  // First we need to get a token.
  // Wait, I can just call the function directly without http!
  // I will just make an express mock or something.
}
run();
