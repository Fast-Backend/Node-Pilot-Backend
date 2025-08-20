import fs from 'fs-extra';
import path from 'path';
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
import { generateEnvFile } from '../generators/env.generator';
import { generateReadme } from '../generators/readme.generator';
import { generateTestDataSeeder } from '../generators/seeder.generator';
import { generateSwaggerDocs } from '../generators/swagger.generator';
import { generateUtils } from '../generators/utils.generator';

export const generateWorkflow = async (data: Workflows) => {
    const workflow = data.workflows;
    if (!workflow) throw new Error('Workflow not found');

    const genDir = generateFolderName()

    const baseDir = path.join(__dirname, '../../generated', genDir, data.name);
    await fs.ensureDir(baseDir);
    await generateTSConfigWithComments(baseDir);
    await generateUtils(baseDir);

    let controllerNames = [];

    for (const controller of workflow) {
        controllerNames.push(controller.name);
        await generateType(controller.name, baseDir, controller.relations, controller.props)

        await generatePrismaService({ modelName: controller.name, baseDir });

        await generateController(controller.name, baseDir, controller.props, controller.relations);

        await generateRoute(controller.name, baseDir);

    }
    await generatePrismaClientFile(baseDir);
    await generateSchemaPrisma(baseDir, workflow);

    await generateAppTs(baseDir, controllerNames, data.cors)
    await generateServerTs(baseDir);
    await generatePackageJson(data.name, baseDir);
    await generateEnvFile(baseDir);
    await generateReadme({ 
        baseDir, 
        projectName: data.name,
        hasSwagger: data.features?.apiDocumentation.enabled || false,
        hasSeeding: data.features?.testDataSeeding.enabled || false
    })

    // Generate optional features if enabled
    if (data.features) {
        // Generate test data seeding if enabled
        if (data.features.testDataSeeding.enabled) {
            await generateTestDataSeeder({
                baseDir,
                workflows: workflow,
                recordCount: data.features.testDataSeeding.recordCount,
                locale: data.features.testDataSeeding.locale,
                customSeed: data.features.testDataSeeding.customSeed,
            });
        }

        // Generate API documentation if enabled
        if (data.features.apiDocumentation.enabled) {
            await generateSwaggerDocs({
                baseDir,
                workflows: workflow,
                title: data.features.apiDocumentation.title || data.name,
                description: data.features.apiDocumentation.description || `API documentation for ${data.name}`,
                version: data.features.apiDocumentation.version,
                includeSwaggerUI: data.features.apiDocumentation.includeSwaggerUI,
                projectName: data.name,
            });
        }
    }

    return { message: 'Workflow generated successfully.', baseDir };
};

export const generateFolderName = (): string => {
    const now = new Date();

    const pad = (n: number) => n.toString().padStart(2, '0');

    const datePart = [
        now.getFullYear(),
        pad(now.getMonth() + 1),
        pad(now.getDate()),
    ].join('-');

    const timePart = [
        pad(now.getHours()),
        pad(now.getMinutes()),
        pad(now.getSeconds()),
    ].join('-');

    const randomPart = Math.random().toString(36).substring(2, 8); // 6-char alphanumeric

    return `${datePart}_${timePart}_${randomPart}`;
};