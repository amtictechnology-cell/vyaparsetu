const fs = require('fs');

let content = fs.readFileSync('app/supplier/customer-profile.tsx', 'utf8');

// 1. Update bill APIs from /supplier/bill to /supplier/customer-bill
content = content.replace(/\/supplier\/bill/g, '/supplier/customer-bill');

fs.writeFileSync('app/supplier/customer-profile.tsx', content, 'utf8');
