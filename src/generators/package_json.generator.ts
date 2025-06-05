import fs from 'fs-extra';
import path from 'path';

export const generatePackageJson = async (
    name: string, baseDir: string
) => {
    const pkg = `
    {
  "name": "${name}",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "dev": "ts-node-dev src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": "",
  "dependencies": {
    "@prisma/client": "^6.9.0",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0",
    "express": "^5.1.0",
    "fs-extra": "^11.3.0",
    "zod": "^3.25.51"
  },
  "devDependencies": {
    "@types/cors": "^2.8.18",
    "@types/express": "^5.0.2",
    "@types/fs-extra": "^11.0.4",
    "@types/node": "^22.15.29",
    "prisma": "^6.9.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.8.3"
  }
}
    `.trim();
    const targetPath = path.join(baseDir, '/');
    await fs.ensureDir(targetPath);

    const file = path.join(targetPath, 'package.json');
    await fs.writeFile(file, pkg);
};