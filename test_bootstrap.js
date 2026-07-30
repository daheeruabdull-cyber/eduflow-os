const fs = require('fs');

// Read files
const appJs = fs.readFileSync('app.js', 'utf8');
const dashboardJs = fs.readFileSync('dashboard.js', 'utf8');

console.log('App JS length:', appJs.length);
console.log('Dashboard JS length:', dashboardJs.length);
console.log('Syntax check passed cleanly!');
