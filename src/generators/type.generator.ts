import path from 'path';
import fs from 'fs-extra';
import { Properties } from '../types/workflow';
import { capitalize, mapFieldType } from '../utils/helpers';

export const generateType = async (name: string, baseDir: string, properties?: Properties[]) => {

    if (properties?.length === 0 || !properties) {
        return;
    }
    const typeName = `${capitalize(name)}Type`;

    const lines = properties.map((prop) => {
        const optional = prop.nullable ? '?' : '';
        const nullableUnion = prop.nullable ? ' | null' : '';
        return `  ${prop.name}${optional}: ${mapFieldType(prop.type)}${nullableUnion};`;
    });

    const content = `export type ${typeName} = {\n${lines.join('\n')}\n};\n`;

    const targetPath = path.join(baseDir, 'src/types');
    await fs.ensureDir(targetPath);

    const file = path.join(targetPath, `${name}.ts`);
    await fs.writeFile(file, content);
};