import fs from 'fs-extra';
import path from 'path';
import { capitalize } from '../utils/helpers';

type PrismaServiceOptions = {
    baseDir: string;
    modelName: string; // Should match the Prisma model name (e.g., "User", "Product")
};

export async function generatePrismaService({ modelName, baseDir }: PrismaServiceOptions) {
    const camelModel = modelName.charAt(0).toLowerCase() + modelName.slice(1);

    const content = `

import { PrismaClient } from '@prisma/client';
import { ${capitalize(modelName)}Type } from '../types/${modelName}';

const prisma = new PrismaClient();

export const ${capitalize(modelName)}Service = {
  async getAll(query: any) {
   const {
    skip = '0',
    take = '10',
    sortBy = 'createdAt',
    order = 'desc',
    search,
    ...filters
  } = query;

  const skipNum = Math.max(parseInt(skip) || 0, 0);
  const takeNum = Math.min(parseInt(take) || 10, 100);
  const orderValue = (order === 'asc' || order === 'desc') ? order : 'desc';

  const where: any = {};

  if (search) {
    where.name = {
      contains: search,
      mode: 'insensitive',
    };
  }

  Object.keys(filters).forEach((key) => {
    if (typeof filters[key] === 'string') {
      where[key] = filters[key];
    }
  });

  const [data, total] = await Promise.all([
    prisma.${camelModel}.findMany({
      where,
      skip: skipNum,
      take: takeNum,
      orderBy: {
        [sortBy]: orderValue,
      },
    }),
    prisma.${camelModel}.count({ where }),
  ]);

  return {
      data, meta: {
        total, skip: skipNum, take: takeNum
      }
    }
  },

  async getById(id: string) {
    return await prisma.${camelModel}.findUnique({
    where: { id },
  });
  },

  async create(data: any) {
      return await prisma.${camelModel}.create({ data });
  },

async update(id: string, data: Partial<${capitalize(modelName)}Type>){
  const existing = await prisma.${camelModel}.findUnique({ where: { id } });
  if (!existing) return null;

  return await prisma.${camelModel}.update({
    where: { id },
    data,
  });
},

 async delete (id: string){
  const existing = await prisma.${camelModel}.findUnique({ where: { id } });
  if (!existing) return false;

  await prisma.${camelModel}.delete({ where: { id } });
  return true;
},
};
`.trim();

    const targetPath = path.join(baseDir, 'src/services');
    await fs.ensureDir(targetPath);

    const file = path.join(targetPath, `${modelName}.service.ts`);
    await fs.writeFile(file, content);
}