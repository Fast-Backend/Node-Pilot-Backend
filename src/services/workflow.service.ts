import fs from 'fs-extra';
import path from 'path';
import { workflows } from '../mock/workflow.models';
import { generateController } from '../generators/controller.generator';
import { generateRoute } from '../generators/route.generator';
import { generateType } from '../generators/type.generator';

export const generateWorkflow = async () => {
    const workflow = workflows.workflows;
    if (!workflow) throw new Error('Workflow not found');

    const baseDir = path.join(__dirname, '../../generated', workflows.name);
    await fs.ensureDir(baseDir);



    for (const controller of workflow) {
        await generateType(controller.controllers.name, baseDir, controller.props)

        await generateController(controller.controllers.name, baseDir, controller.props);

        await generateRoute(controller.controllers.name, controller.controllers.routes, baseDir);
    }

    return { message: 'Workflow generated successfully.' };
};