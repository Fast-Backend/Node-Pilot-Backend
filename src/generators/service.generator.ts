import fs from 'fs-extra';
import path from 'path';
import { validateEntityName } from '../utils/helpers';
import { generateServiceTemplate } from '../templates/service.template';

type PrismaServiceOptions = {
  baseDir: string;
  modelName: string; // Should match the Prisma model name (e.g., "User", "Product")
};

export async function generatePrismaService({ modelName, baseDir }: PrismaServiceOptions) {
  // Validate entity name
  const entityValidation = validateEntityName(modelName);
  if (!entityValidation.isValid) {
    throw new Error(`Invalid model name "${modelName}": ${entityValidation.errors.join(', ')}`);
  }

  const template = generateServiceTemplate(modelName);
  
  const content = `${template.imports}

${template.class}`;

  const targetPath = path.join(baseDir, 'src/services');
  await fs.ensureDir(targetPath);

  const file = path.join(targetPath, `${modelName}.service.ts`);
  await fs.writeFile(file, content);
}