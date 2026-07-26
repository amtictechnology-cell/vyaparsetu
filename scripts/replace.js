const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/DriverProfile.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace primary color
content = content.replace(/#0c831f/g, '#0059ff');

// Replace background yellow to white
content = content.replace(/#ffb703/g, '#ffffff');

// For the FAB button specifically:
// The FAB button in DriverProfile has:
/*
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#0059ff', // this was replaced from #0c831f
*/
content = content.replace(
    /fab: {[\s\S]*?backgroundColor: '#0059ff'/g,
    match => match.replace('#0059ff', '#ff6600')
);

// For light green backgrounds (like avatars and filters), change to light blue
content = content.replace(/#e8f5e9/g, '#e6f0ff');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated colors in DriverProfile.tsx');
