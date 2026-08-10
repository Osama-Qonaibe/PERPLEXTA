import fs from 'fs';

let content = fs.readFileSync('server/routes/admin.ts', 'utf8');

const assetUploadOld = `
    const optResult = await optimizeUploadedImage(req.file.path, req.file.originalname);
    const imageUrl = normalizeMediaUrl(optResult.fileUrl);
    res.json({ success: true, imageUrl });
`;

const assetUploadNew = `
    const optResult = await optimizeUploadedImage(req.file.path, req.file.originalname);
    
    // Read the optimized file into a base64 string to persist across container reboots
    const optimizedPath = path.join(process.cwd(), optResult.fileUrl.replace(/^\\//, ''));
    const fileBuffer = await fs.readFile(optimizedPath);
    const base64Str = \`data:image/\${optResult.format || 'webp'};base64,\${fileBuffer.toString('base64')}\`;
    
    // Clean up local files
    await fs.unlink(req.file.path).catch(() => {});
    await fs.unlink(optimizedPath).catch(() => {});

    res.json({ success: true, imageUrl: base64Str });
`;

content = content.replace(assetUploadOld, assetUploadNew);

const seoUploadOld = `
    const optResult = await optimizeUploadedImage(req.file.path, req.file.originalname);
    const imageUrl = normalizeMediaUrl(optResult.fileUrl);
    res.json({ success: true, imageUrl });
`;

// It occurs twice, but replace will just replace the first then the second
content = content.replace(seoUploadOld, assetUploadNew);

fs.writeFileSync('server/routes/admin.ts', content);
