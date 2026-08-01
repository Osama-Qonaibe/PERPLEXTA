const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let lines = content.split('\n');
    let newLines = [];
    let changed = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Remove lines that are purely comments (start with optional whitespace and //)
        // Keep lines containing eslint, @ts-, TODO if we want, but let's just remove them.
        if (/^\s*\/\/(?!\/).*$/.test(line)) {
            // Check if it's not a special directive
            if (!line.includes('eslint') && !line.includes('@ts-') && !line.includes('TODO')) {
                changed = true;
                continue;
            }
        }
        
        // Remove trailing comments? 
        // e.g. `const x = 1; // some comment` -> too hard to regex safely because of strings.
        
        newLines.push(line);
    }

    if (changed) {
        fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
        console.log(`Cleaned comments in: ${filePath}`);
    }
}

function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile()) {
            if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
                callback(filePath);
            }
        } else if (stat.isDirectory() && name !== 'node_modules' && name !== 'dist' && !name.startsWith('.')) {
            walkSync(filePath, callback);
        }
    });
}

walkSync('./server', processFile);
walkSync('./src', processFile);
