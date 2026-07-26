const fs = require('fs');
const path = require('path');

function fixStaffUrl(filename) {
    const filePath = path.join(__dirname, '../app', filename);
    let content = fs.readFileSync(filePath, 'utf8');

    // Make sure STAFF_BASE_URL is imported
    if (!content.includes('STAFF_BASE_URL')) {
        content = content.replace(
            "import { BASE_URL } from '../constants/Config';",
            "import { BASE_URL, STAFF_BASE_URL } from '../constants/Config';"
        );
    }

    // Replace ${BASE_URL}/staff with ${STAFF_BASE_URL}/staff
    content = content.replace(/\$\{BASE_URL\}\/staff/g, '${STAFF_BASE_URL}/staff');

    fs.writeFileSync(filePath, content, 'utf8');
}

try {
    fixStaffUrl('staffmanagment.tsx');
    fixStaffUrl('staffprofile.tsx');
    console.log("Updated to use STAFF_BASE_URL");
} catch (e) {
    console.error(e);
}
