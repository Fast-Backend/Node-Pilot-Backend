import fs from 'fs-extra';
import path from 'path';

export const generatePrismaClientFile = async (baseDir: string) => {
    const content = `
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
`.trim();

    const targetPath = path.join(baseDir, 'src/lib');
    await fs.ensureDir(targetPath);

    const file = path.join(targetPath, `prisma.ts`);
    await fs.writeFile(file, content);
};