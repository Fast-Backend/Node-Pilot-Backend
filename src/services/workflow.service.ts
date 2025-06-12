import fs from 'fs-extra';
import path from 'path';
import { workflows } from '../mock/workflow.models';
import { generateController } from '../generators/controller.generator';
import { generateRoute } from '../generators/route.generator';
import { generateAppTs } from '../generators/app.generator';
import { generateServerTs } from '../generators/server.generator';
import { generateTSConfigWithComments } from '../generators/tsconfig.generator';
import { generatePrismaService } from '../generators/service.generator';
import { generateSchemaPrisma } from '../generators/prisma-schema.generator';
import { generatePrismaClientFile } from '../generators/prisma_lib.generator';
import { generatePackageJson } from '../generators/package_json.generator';
import { generateType } from '../generators/type.generator';
import { Workflows } from '../types/workflow';

export const generateWorkflow = async (data: Workflows) => {
    const workflow = data.workflows;
    if (!workflow) throw new Error('Workflow not found');

    const baseDir = path.join(__dirname, '../../generated', workflows.name);
    await fs.ensureDir(baseDir);
    await generateTSConfigWithComments(baseDir);


    let controllerNames = [];

    for (const controller of workflow) {
        controllerNames.push(controller.name);
        await generateType(controller.name, baseDir, controller.relations, controller.props)

        await generatePrismaService({ modelName: controller.name, baseDir });

        await generateController(controller.name, baseDir, controller.props, controller.relations);

        await generateRoute(controller.name, controller.routes, baseDir);

    }
    await generatePrismaClientFile(baseDir);
    await generateSchemaPrisma(baseDir, workflow);

    await generateAppTs(baseDir, controllerNames, workflows.cors)
    await generateServerTs(baseDir);
    await generatePackageJson(workflows.name, baseDir);

    return { message: 'Workflow generated successfully.' };
};