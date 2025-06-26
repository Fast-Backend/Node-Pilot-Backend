import path from 'path';
import fs from 'fs-extra';

export const generateEnvFile = async (
    baseDir: string
) => {
    const content = `
DATABASE_URL=
  `.trim() + '\n';

    const targetPath = path.join(baseDir, '');
    await fs.ensureDir(targetPath);

    const file = path.join(targetPath, '.env');
    await fs.writeFile(file, content);
};