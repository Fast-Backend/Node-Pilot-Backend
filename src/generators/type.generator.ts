import path from 'path';
import fs from 'fs-extra';
import { Properties, Relation } from '../types/workflow';
import { capitalize, mapFieldType } from '../utils/helpers';

export const generateType = async (name: string, baseDir: string, relations?: Relation[], properties?: Properties[]) => {

    if (properties?.length === 0 || !properties) {
        return;
    }
    const typeName = `${capitalize(name)}Type`;

    const lines = properties.map((prop) => {
        const optional = prop.nullable ? '?' : '';
        const nullableUnion = prop.nullable ? ' | null' : '';
        return `  ${prop.name}${optional}: ${mapFieldType(prop.type)}${nullableUnion};`;
    });
    let r = null;
    if (relations) {
        r = relations && relations?.map((relation) => {
            if (!relation.isParent) {
                if (relation.relation === "one-to-one" || relation.relation === "one-to-many") {
                    return `\t${relation.controller}: {\n\t\tconnect: {\n\t\t\tid: string\n\t\t}\n\t}`
                }
            }
        })
    }

    const content = `export type ${typeName} = {\n${lines.join('\n')}\n${r ? r?.join('\n') : ""}\n};\n`;

    const targetPath = path.join(baseDir, 'src/types');
    await fs.ensureDir(targetPath);

    const file = path.join(targetPath, `${name}.ts`);
    await fs.writeFile(file, content);
};