const fs = require('fs');
const path = require('path');

const packageJsonPath = path.resolve('./package.json');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath));

delete packageJson.gitHead;

fs.writeFileSync(
  packageJsonPath,
  JSON.stringify(packageJson, undefined, 2) + '\n',
);
