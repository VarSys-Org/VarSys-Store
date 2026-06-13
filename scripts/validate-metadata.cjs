const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== 'dist' && f !== '.git' && f !== 'build' && f !== '.vercel') {
        walkDir(dirPath, callback);
      }
    } else {
      callback(dirPath);
    }
  });
}

let failed = false;

walkDir(path.join(__dirname, '../src'), (filePath) => {
  const ext = path.extname(filePath);
  if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Skip file if validation is explicitly disabled
    if (content.includes('@meta-validate-disable')) {
      return;
    }
    
    // Look for Appwrite document creation/updates
    if (content.includes('databases.createDocument') || content.includes('databases.updateDocument')) {
      const hasUserId = content.includes('user_id') || content.includes('userId');
      const hasTeamId = content.includes('team_id') || content.includes('teamId');
      const hasTeamName = content.includes('team_name') || content.includes('teamName');
      const hasMember = content.includes('member');
      
      if (!hasUserId || !hasTeamId || !hasTeamName || !hasMember) {
        console.error(`❌ ERROR: ${filePath} contains database write operation but is missing key metadata scoping (user_id, team_id, team_name, or member)!`);
        failed = true;
      }
    }
  }
});

if (failed) {
  console.error('\n❌ Metadata validation failed. Please check the errors above.');
  process.exit(1);
} else {
  console.log('✅ Metadata validation passed. All database operations are properly scoped.');
  process.exit(0);
}
