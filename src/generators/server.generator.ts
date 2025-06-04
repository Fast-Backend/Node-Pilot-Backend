import fs from 'fs-extra';
import path from 'path';

export const generateServerTs = async (baseDir: string) => {
    const content = `
import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(\`Server is running on http://localhost:\${PORT}\`);
});
`.trim();

    const targetPath = path.join(baseDir, 'src');
    await fs.ensureDir(targetPath);

    const file = path.join(targetPath, 'server.ts');
    await fs.writeFile(file, content);
};