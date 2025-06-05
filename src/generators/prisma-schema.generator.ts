import { Properties, Workflow } from "../types/workflow";
import path from 'path';
import fs from 'fs-extra';
import { capitalize } from "../utils/helpers";
import pluralize from "pluralize";

const mapToPrismaType = (type: string): string => {
    switch (type.toLowerCase()) {
        case 'string': return 'String';
        case 'number': return 'Int';
        case 'float': return 'Float';
        case 'boolean': return 'Boolean';
        case 'datetime':
        case 'date': return 'DateTime';
        case 'json': return 'Json';
        case 'bytes': return 'Bytes';
        case 'decimal': return 'Decimal';
        case 'bigint': return 'BigInt';
        default: return 'String'; // fallback
    }
};

export const generateSchemaPrisma = async (baseDir: string, workflow: Workflow[],) => {
    let schema = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

`;
    for (const w of workflow) {
        const modelName = w.controllers.name.charAt(0).toUpperCase() + w.controllers.name.slice(1);

        let model = `model ${modelName} {\n`;
        model += `  id  String   @id @default(uuid())\n`;

        w.props && w.props.forEach(prop => {
            const prismaType = mapToPrismaType(prop.type);
            const nullable = prop.nullable ? '?' : '';
            model += `  ${prop.name}   ${prismaType}${nullable}\n`;
        });
        w.relations?.map((relation) => {
            if (relation.relation === "one-to-one") {
                if (relation.isParent) {
                    model += `  ${relation.controller} ${capitalize(relation.controller)}?\n`
                }
                else {
                    model += `  ${relation.controller} ${capitalize(relation.controller)}  @relation(fields: [${relation.controller}Id], references: [id])\n`
                    model += `  ${relation.controller}Id   String   @unique\n`
                }
            }
            else if (relation.relation === "one-to-many") {
                if (relation.isParent) {
                    model += `  ${pluralize(relation.controller)} ${capitalize(relation.controller)}[]\n`
                }
                else {
                    model += `  ${relation.controller} ${capitalize(relation.controller)}  @relation(fields: [${relation.controller}Id], references: [id])\n`
                    model += `  ${relation.controller}   String\n`
                }
            }
            else {

                model += `  ${pluralize(relation.controller)} ${capitalize(relation.controller)}[]\n`
            }
        })
        model += `  createdAt DateTime @default(now())\n`;
        model += `  updatedAt DateTime @updatedAt\n`;

        model += `}\n\n`;

        schema += model;
    }

    const targetPath = path.join(baseDir, '/prisma');
    await fs.ensureDir(targetPath);

    const file = path.join(targetPath, 'schema.prisma');
    await fs.writeFile(file, schema);
};