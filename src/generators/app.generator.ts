import path from 'path';
import fs from 'fs-extra';


export const generateAppTs = async (
    baseDir: string,
    routes: string[] = []
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

    const content = `
import express from 'express';
import cors from 'cors';
${routeImports}

const app = express();

app.use(cors());
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