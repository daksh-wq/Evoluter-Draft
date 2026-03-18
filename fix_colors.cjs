const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'admin', 'views');

function replaceColors(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Common indigo classes replaced with brand color
    content = content.replace(/bg-indigo-600/g, 'bg-[#2278B0]');
    content = content.replace(/bg-indigo-700/g, 'bg-[#1b5f8a]');
    content = content.replace(/bg-indigo-500/g, 'bg-[#2278B0]');
    content = content.replace(/text-indigo-600/g, 'text-[#2278B0]');
    content = content.replace(/text-indigo-700/g, 'text-[#1b5f8a]');
    content = content.replace(/text-indigo-800/g, 'text-[#124263]');
    content = content.replace(/border-indigo-200/g, 'border-[#2278B0]/20');
    content = content.replace(/border-indigo-600/g, 'border-[#2278B0]');
    content = content.replace(/ring-indigo-500/g, 'ring-[#2278B0]');
    content = content.replace(/ring-indigo-400/g, 'ring-[#2278B0]/80');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
}

const files = fs.readdirSync(dir);
files.forEach(file => {
    if (file.endsWith('.jsx')) {
        replaceColors(path.join(dir, file));
    }
});
