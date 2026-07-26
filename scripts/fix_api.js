const fs = require('fs');
const path = require('path');

function fixFile(filename) {
    const filePath = path.join(__dirname, '../app', filename);
    let content = fs.readFileSync(filePath, 'utf8');

    // Add import if missing
    if (!content.includes('import { BASE_URL }')) {
        if (content.includes('import { useRouter }')) {
            content = content.replace(
                /import\s+\{\s*useRouter\s*\}\s+from\s+["']expo-router["'];/,
                "import { useRouter } from \"expo-router\";\nimport { BASE_URL } from '../constants/Config';"
            );
        } else {
            // just put it at the very top
            content = "import { BASE_URL } from '../constants/Config';\n" + content;
        }
    }

    // Also replace hardcoded base URLs where it might have been placed earlier
    content = content.replace(/["']http:\/\/192\.168\.31\.192:[0-9]{4}\/api\/v1(.*?)["']/g, '`${BASE_URL}$1`');
    content = content.replace(/`http:\/\/192\.168\.31\.192:[0-9]{4}\/api\/v1(.*?)`/g, '`${BASE_URL}$1`');

    fs.writeFileSync(filePath, content, 'utf8');
}

try {
    fixFile('staffmanagment.tsx');
    fixFile('staffprofile.tsx');
    console.log('Fixed API URLs');
} catch (e) {
    console.error(e);
}
