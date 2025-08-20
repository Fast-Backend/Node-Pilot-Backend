import fs from 'fs-extra';
import path from 'path';
// import { RouteMethods } from '../types/workflow';
import { capitalize } from '../utils/helpers';
import pluralize from 'pluralize';

export const generateRoute = async (
    name: string,
    // methods: RouteMethods[] | null,
    baseDir: string
) => {
    const capitalizedName = capitalize(name)
    let routers = `
router.get('/', getAll${capitalizedName});
router.get('/:id', get${capitalizedName}ById);
router.post('', create${capitalizedName});
router.put('/:id', update${capitalizedName});
router.delete('/:id', delete${capitalizedName});`;

    //     if (methods === null) {
    //         routers = `
    // router.get('/', getAll${controllerName});
    // router.get('/:id', get${capitalize(name)}ById);
    // router.post('', create${capitalize(name)});
    // router.put('/:id', update${capitalize(name)});
    // router.delete('/:id', delete${capitalize(name)});`;
    //     } else {
    //         const routeLines: string[] = [];

    //         if (methods.includes('GET')) {
    //             routeLines.push(`router.get('/', getAll${controllerName});`);
    //         }

    //         if (methods.includes('GET_ID')) {
    //             routeLines.push(`router.get('/:id', get${controllerName}ById);`);
    //         }

    //         if (methods.includes('POST')) {
    //             routeLines.push(`router.post('', create${controllerName});`);
    //         }

    //         if (methods.includes('PUT')) {
    //             routeLines.push(`router.put('/:id', update${controllerName});`);
    //         }

    //         if (methods.includes('DELETE')) {
    //             routeLines.push(`router.delete('/:id', delete${controllerName});`);
    //         }

    //         routers = routeLines.join('\n');
    //     }

    let importStatement = `import { getAll${capitalizedName}, get${capitalizedName}ById, create${capitalizedName}, update${capitalizedName}, delete${capitalizedName} } from '../controllers/${name}.controller';`;

    // if (methods === null) {
    //     importStatement = `import { getAll${controllerName}, get${capitalize(name)}ById, create${capitalize(name)}, update${capitalize(name)}, delete${capitalize(name)} } from '../controllers/${name}.controller';`;
    // } else {
    //     const availableMethodsMap: Record<string, string> = {
    //         getAll: `getAll${controllerName}`,
    //         getById: `get${capitalize(name)}ById`,
    //         create: `create${capitalize(name)}`,
    //         update: `update${capitalize(name)}`,
    //         delete: `delete${capitalize(name)}`,
    //     };

    //     const imports = methods.map((method) => availableMethodsMap[method]).filter(Boolean);
    //     importStatement = `import { ${imports.join(', ')} } from '../controllers/${name}.controller';`;
    // }
    const code = `
import { Router } from 'express';
${importStatement}

const router = Router();

${routers};

export default router;
`.trim();

    const targetPath = path.join(baseDir, 'src/routes');
    await fs.ensureDir(targetPath);

    const file = path.join(targetPath, `${name}.routes.ts`);
    await fs.writeFile(file, code);
};