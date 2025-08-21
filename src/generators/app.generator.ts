import path from 'path';
import fs from 'fs-extra';
import { CorsOptionsCustom } from '../types/workflow';


export const generateAppTs = async (
    baseDir: string,
    routes: string[] = [],
    cors?: CorsOptionsCustom,
    hasOAuth: boolean = false
) => {
    const routeImports = routes
        .map(
            (r) =>
                `import ${r}Router from './routes/${r}.routes';`
        )
        .join('\n');

    const oauthImports = hasOAuth ? `
import session from 'express-session';
import oauthRouter from './routes/oauth.routes';
import { initializePassport } from './auth/middleware';` : '';

    const routeUses = routes
        .map(
            (r) =>
                `app.use('/api/${r}', ${r}Router);`
        )
        .join('\n');

    const oauthMiddleware = hasOAuth ? `
// Session configuration for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Initialize Passport
initializePassport(app);` : '';

    const oauthRoutes = hasOAuth ? `
// OAuth routes
app.use(oauthRouter);` : '';

    const corsConfig =
        cors && Object.keys(cors).length > 0
            ? `app.use(cors(${JSON.stringify(cors, null, 2)}));`
            : 'app.use(cors());';

    const content = `
import express from 'express';
import cors from 'cors';${oauthImports}
${routeImports}

const app = express();

${corsConfig}
app.use(express.json());${oauthMiddleware}

app.get('/', (req, res) => {
  res.send('Home page');
});

${routeUses}${oauthRoutes}

export default app;
  `.trim() + '\n';

    const targetPath = path.join(baseDir, 'src');
    await fs.ensureDir(targetPath);

    const file = path.join(targetPath, 'app.ts');
    await fs.writeFile(file, content);
};