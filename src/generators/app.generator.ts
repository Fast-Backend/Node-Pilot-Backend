import path from 'path';
import fs from 'fs-extra';
import { CorsOptionsCustom } from '../types/workflow';


export const generateAppTs = async (
    baseDir: string,
    routes: string[] = [],
    cors?: CorsOptionsCustom
) => {
    const routeImports = routes
        .map(
            (r) =>
                `import ${r}Router from './routes/${r}.routes';`
        )
        .join('\n');

    const routeUses = routes
        .map(
            (r) =>
                `app.use('/api/${r}', ${r}Router);`
        )
        .join('\n');

    const corsConfig =
        cors && Object.keys(cors).length > 0
            ? `app.use(cors(${JSON.stringify(cors, null, 2)}));`
            : 'app.use(cors());';

    const content = `
import express from 'express';
import cors from 'cors';
${routeImports}

const app = express();

${corsConfig}
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Home page');
});

${routeUses}

export default app;
  `.trim() + '\n';

    const targetPath = path.join(baseDir, 'src');
    await fs.ensureDir(targetPath);

    const file = path.join(targetPath, 'app.ts');
    await fs.writeFile(file, content);
};