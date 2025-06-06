import fs from 'fs-extra';
import path from 'path';
import { capitalize } from '../utils/helpers';
import { Properties, Relation } from '../types/workflow';
import { createNew } from './controller/createNew';
import { getAll } from './controller/getAll';
import { getById } from './controller/getById';
import { update } from './controller/update';
import { deleteById } from './controller/delete';
import pluralize from 'pluralize';

export const generateController = async (name: string, baseDir: string, properties?: Properties[], relations?: Relation[]) => {
  const controllerName = pluralize(capitalize(name));
  const allData = pluralize(name);
  const getAllfunc = getAll(name, controllerName, allData);
  const createFunc = createNew(name, properties, relations)
  const getByIdFunc = getById(name);
  const updateByIdFunc = update(name, properties)
  const deleteByIdFunc = deleteById(name);
  const code = `
import { Request, Response } from 'express';
${createFunc && `import { z } from 'zod';
import { ${capitalize(name)}Type } from "../types/${name}";
import {${capitalize(name)}Service } from '../services/${name}.service';
${relations && `import prisma from '../lib/prisma';`}

`}
  ${getAllfunc}
  ${createFunc}
  ${getByIdFunc}
  ${updateByIdFunc}
  ${deleteByIdFunc}
`.trim();

  const targetPath = path.join(baseDir, 'src/controllers');
  await fs.ensureDir(targetPath);

  const file = path.join(targetPath, `${name}.controller.ts`);
  await fs.writeFile(file, code);
};

