import fs from 'fs-extra';
import path from 'path';
import { workflows } from '../mock/workflow.models';
import { generateController } from '../generators/controller.generator';
import { generateRoute } from '../generators/route.generator';
import { generateType } from '../generators/type.generator';
import { generateAppTs } from '../generators/app.generator';
import { generateServerTs } from '../generators/server.generator';
import { generateTSConfigWithComments } from '../generators/tsconfig.generator';
import { generatePrismaService } from '../generators/service.generator';
import { generateSchemaPrisma } from '../generators/prisma-schema.generator';

export const generateWorkflow = async () => {
    const workflow = workflows.workflows;
    if (!workflow) throw new Error('Workflow not found');

    const baseDir = path.join(__dirname, '../../generated', workflows.name);
    await fs.ensureDir(baseDir);
    await generateTSConfigWithComments(baseDir);


    let controllerNames = [];

    for (const controller of workflow) {
        controllerNames.push(controller.controllers.name);
        await generateType(controller.controllers.name, baseDir, controller.props)

        await generatePrismaService({ modelName: controller.controllers.name, baseDir });

        await generateController(controller.controllers.name, baseDir, controller.props);

        await generateRoute(controller.controllers.name, controller.controllers.routes, baseDir);

    }
    await generateSchemaPrisma(baseDir, workflow);

    await generateAppTs(baseDir, controllerNames, workflows.cors)
    await generateServerTs(baseDir);

    return { message: 'Workflow generated successfully.' };
};