import fs from 'fs-extra';
import path from 'path';
import { capitalize, validateEntityName, validatePropertyName } from '../utils/helpers';
import { Properties, Relation } from '../types/workflow';
import { generateControllerTemplate } from '../templates/controller.template';

export const generateController = async (name: string, baseDir: string, properties?: Properties[], relations?: Relation[]) => {
  // Validate entity name
  const entityValidation = validateEntityName(name);
  if (!entityValidation.isValid) {
    throw new Error(`Invalid entity name "${name}": ${entityValidation.errors.join(', ')}`);
  }

  // Validate property names
  if (properties) {
    for (const prop of properties) {
      const propValidation = validatePropertyName(prop.name);
      if (!propValidation.isValid) {
        throw new Error(`Invalid property name "${prop.name}" in entity "${name}": ${propValidation.errors.join(', ')}`);
      }
    }
  }

  const template = generateControllerTemplate(name, properties, relations);
  
  const code = `${template.imports}

${template.methods.getAll}

${template.methods.getById}

${template.methods.create}

${template.methods.update}

${template.methods.delete}`;

  const targetPath = path.join(baseDir, 'src/controllers');
  await fs.ensureDir(targetPath);

  const file = path.join(targetPath, `${name}.controller.ts`);
  await fs.writeFile(file, code);
};

