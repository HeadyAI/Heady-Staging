const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing HeadyAI-IDE...');

try {
  const idePath = path.join(__dirname, '..', 'HeadyAI-IDE');
  
  // Install missing dependencies
  console.log('📦 Installing dependencies...');
  execSync('npm install @tailwindcss/postcss react-router-dom framer-motion lucide-react @monaco-editor/react', {
    cwd: idePath,
    stdio: 'inherit'
  });
  
  // Update PostCSS config
  const postcssConfig = path.join(idePath, 'postcss.config.js');
  if (fs.existsSync(postcssConfig)) {
    let content = fs.readFileSync(postcssConfig, 'utf8');
    content = content.replace("tailwindcss: {}", "'@tailwindcss/postcss': {}");
    fs.writeFileSync(postcssConfig, content);
    console.log('✅ PostCSS config updated');
  }
  
  // Build the project
  console.log('🔨 Building...');
  execSync('npm run build', { cwd: idePath, stdio: 'inherit' });
  
  console.log('✅ HeadyAI-IDE fixed and ready to run');
  console.log('To start: cd HeadyAI-IDE && npm start');
  
} catch (error) {
  console.error('❌ Fix failed:', error.message);
  process.exit(1);
}
