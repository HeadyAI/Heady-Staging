mv backend/index.js backend/src/index.js || true
sed -i 's|"main": "backend/index.js"|"main": "backend/src/index.js"|g' package.json
