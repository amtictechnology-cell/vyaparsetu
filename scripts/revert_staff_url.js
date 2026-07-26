const fs = require('fs');
const path = require('path');

// 1. Fix Config.ts
const configPath = path.join(__dirname, '../constants/Config.ts');
fs.writeFileSync(configPath, `export const API_IP = "192.168.31.192";
export const SERVER_URL = \`http://\${API_IP}:5000\`;
export const BASE_URL = \`\${SERVER_URL}/api/v1\`;
`, 'utf8');

// 2. Fix Staff Files
function fixFile(filename) {
    const filePath = path.join(__dirname, '../app', filename);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove STAFF_BASE_URL import
    content = content.replace(/, STAFF_BASE_URL/g, '');
    
    // Replace STAFF_BASE_URL usage
    content = content.replace(/\$\{STAFF_BASE_URL\}/g, '${BASE_URL}');
    
    fs.writeFileSync(filePath, content, 'utf8');
}

fixFile('staffmanagment.tsx');
fixFile('staffprofile.tsx');
console.log("Reverted to BASE_URL");
