import path from 'path';
import fs from 'fs-extra';
import { ProjectFeatures } from '../types/workflow';

export const generateEnvFile = async (
    baseDir: string,
    features?: ProjectFeatures
) => {
    let content = `DATABASE_URL=`;

    // Add OAuth environment variables if OAuth is enabled
    if (features?.oauthProviders.enabled) {
        content += `

# Session configuration
SESSION_SECRET=your-super-secret-session-key

# OAuth Configuration`;

        if (features.oauthProviders.providers.includes('google')) {
            content += `

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:8000/auth/google/callback`;
        }

        if (features.oauthProviders.providers.includes('github')) {
            content += `

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:8000/auth/github/callback`;
        }

        if (features.oauthProviders.providers.includes('facebook')) {
            content += `

# Facebook OAuth
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_CALLBACK_URL=http://localhost:8000/auth/facebook/callback`;
        }

        if (features.oauthProviders.providers.includes('twitter')) {
            content += `

# Twitter OAuth
TWITTER_CONSUMER_KEY=your_twitter_consumer_key
TWITTER_CONSUMER_SECRET=your_twitter_consumer_secret
TWITTER_CALLBACK_URL=http://localhost:8000/auth/twitter/callback`;
        }

        content += `

# Frontend URL for OAuth redirects
CLIENT_URL=http://localhost:3000`;
    }

    content += '\n';

    const targetPath = path.join(baseDir, '');
    await fs.ensureDir(targetPath);

    const file = path.join(targetPath, '.env');
    await fs.writeFile(file, content);
};