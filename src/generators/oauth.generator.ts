import { ProjectFeatures } from '../types/workflow';
import { join } from 'path';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';

export interface OAuthConfig {
  enabled: boolean;
  providers: ('google' | 'github' | 'facebook' | 'twitter')[];
  callbackUrls?: Record<string, string>;
}

export function generateOAuthFiles(projectPath: string, config: OAuthConfig) {
  if (!config.enabled || config.providers.length === 0) {
    return;
  }

  const authDir = join(projectPath, 'src', 'auth');
  const routesDir = join(projectPath, 'src', 'routes');

  // Ensure directories exist
  mkdirSync(authDir, { recursive: true });
  mkdirSync(routesDir, { recursive: true });

  // Update User model with OAuth fields
  updateUserModelForOAuth(projectPath, config.providers);
  
  // Generate OAuth strategies
  generateOAuthStrategies(authDir, config.providers);
  
  // Generate OAuth routes
  generateOAuthRoutes(routesDir, config.providers);
  
  // Generate OAuth middleware
  generateOAuthMiddleware(authDir);
  
  // Generate OAuth utilities
  generateOAuthUtils(authDir, config.providers);
  
  // Update package.json with OAuth dependencies
  updatePackageJsonForOAuth(join(projectPath, 'package.json'), config.providers);
}

function updateUserModelForOAuth(projectPath: string, providers: string[]) {
  const userTypesPath = join(projectPath, 'src', 'types', 'User.ts');
  
  if (!existsSync(userTypesPath)) {
    // Create User interface with OAuth fields if it doesn't exist
    const userInterfaceContent = generateUserInterface(providers);
    writeFileSync(userTypesPath, userInterfaceContent);
  } else {
    // Update existing User interface to include OAuth fields
    let content = readFileSync(userTypesPath, 'utf8');
    
    // Add OAuth ID fields if they don't exist
    providers.forEach(provider => {
      const oauthField = `${provider}Id?: string;`;
      if (!content.includes(oauthField)) {
        // Insert before the closing brace of the User interface
        content = content.replace(
          /(\s+createdAt: Date;\s+updatedAt: Date;\s*})/,
          `  ${oauthField}\n$1`
        );
      }
    });
    
    writeFileSync(userTypesPath, content);
  }
}

function generateUserInterface(providers: string[]): string {
  const oauthFields = providers.map(provider => `  ${provider}Id?: string;`).join('\n');
  
  return `export interface User {
  id: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetTokenExpiry?: Date;
  refreshToken?: string;
  lastLoginAt?: Date;
${oauthFields}
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterUserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginUserData {
  email: string;
  password: string;
}
`;
}

function generateOAuthStrategies(authDir: string, providers: string[]) {
  const strategies = providers.map(provider => {
    switch (provider) {
      case 'google':
        return generateGoogleStrategy();
      case 'github':
        return generateGitHubStrategy();
      case 'facebook':
        return generateFacebookStrategy();
      case 'twitter':
        return generateTwitterStrategy();
      default:
        return '';
    }
  }).join('\n\n');

  const strategyFile = `
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { PrismaClient } from '@prisma/client';
import { JWTService } from '../utils/jwt';
import { User } from '../types/User';

const prisma = new PrismaClient();

// Serialize/Deserialize user for session
passport.serializeUser((user: User, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, firstName: true, lastName: true }
    });
    done(null, user || undefined);
  } catch (error) {
    done(error, undefined);
  }
});

${strategies}

export default passport;
`;

  writeFileSync(join(authDir, 'strategies.ts'), strategyFile);
}

function generateGoogleStrategy() {
  return `
// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error('No email found from Google'), undefined);
    }

    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          firstName: profile.name?.givenName || '',
          lastName: profile.name?.familyName || '',
          isEmailVerified: true,
          googleId: profile.id,
        }
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.id }
      });
    }

    return done(null, user);
  } catch (error) {
    return done(error, undefined);
  }
}));`;
}

function generateGitHubStrategy() {
  return `
// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  callbackURL: process.env.GITHUB_CALLBACK_URL || '/auth/github/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error('No email found from GitHub'), undefined);
    }

    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          firstName: profile.displayName?.split(' ')[0] || '',
          lastName: profile.displayName?.split(' ').slice(1).join(' ') || '',
          isEmailVerified: true,
          githubId: profile.id,
        }
      });
    } else if (!user.githubId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { githubId: profile.id }
      });
    }

    return done(null, user);
  } catch (error) {
    return done(error, undefined);
  }
}));`;
}

function generateFacebookStrategy() {
  return `
// Facebook OAuth Strategy
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID!,
  clientSecret: process.env.FACEBOOK_APP_SECRET!,
  callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/auth/facebook/callback',
  profileFields: ['id', 'emails', 'name']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error('No email found from Facebook'), undefined);
    }

    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          firstName: profile.name?.givenName || '',
          lastName: profile.name?.familyName || '',
          isEmailVerified: true,
          facebookId: profile.id,
        }
      });
    } else if (!user.facebookId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { facebookId: profile.id }
      });
    }

    return done(null, user);
  } catch (error) {
    return done(error, undefined);
  }
}));`;
}

function generateTwitterStrategy() {
  return `
// Twitter OAuth Strategy
passport.use(new TwitterStrategy({
  consumerKey: process.env.TWITTER_CONSUMER_KEY!,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET!,
  callbackURL: process.env.TWITTER_CALLBACK_URL || '/auth/twitter/callback',
  includeEmail: true
}, async (token, tokenSecret, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error('No email found from Twitter'), undefined);
    }

    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          firstName: profile.displayName?.split(' ')[0] || '',
          lastName: profile.displayName?.split(' ').slice(1).join(' ') || '',
          isEmailVerified: true,
          twitterId: profile.id,
        }
      });
    } else if (!user.twitterId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { twitterId: profile.id }
      });
    }

    return done(null, user);
  } catch (error) {
    return done(error, undefined);
  }
}));`;
}

function generateOAuthRoutes(routesDir: string, providers: string[]) {
  const routeHandlers = providers.map(provider => {
    return `
// ${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth routes
router.get('/auth/${provider}', passport.authenticate('${provider}', {
  scope: ${getOAuthScope(provider)}
}));

router.get('/auth/${provider}/callback', 
  passport.authenticate('${provider}', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      const user = req.user as any;
      const accessToken = JWTService.generateAccessToken(user.id, user.email);
      const refreshToken = JWTService.generateRefreshToken(user.id, user.email);
      
      // Set refresh token in httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Redirect with access token
      const redirectUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      res.redirect(\`\${redirectUrl}/auth/success?token=\${accessToken}\`);
    } catch (error) {
      res.redirect('/login?error=oauth_error');
    }
  }
);`;
  }).join('\n');

  const oauthRoutesFile = `
import { Router } from 'express';
import passport from '../auth/strategies';
import { JWTService } from '../utils/jwt';

const router = Router();

${routeHandlers}

export default router;
`;

  writeFileSync(join(routesDir, 'oauth.routes.ts'), oauthRoutesFile);
}

function getOAuthScope(provider: string): string {
  switch (provider) {
    case 'google':
      return "['profile', 'email']";
    case 'github':
      return "['user:email']";
    case 'facebook':
      return "['email']";
    case 'twitter':
      return "[]";
    default:
      return "[]";
  }
}

function generateOAuthMiddleware(authDir: string) {
  const middlewareFile = `
import { Request, Response, NextFunction } from 'express';
import passport from './strategies';

export const initializePassport = (app: any) => {
  app.use(passport.initialize());
  app.use(passport.session());
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};

export const requireOAuth = (provider: string) => {
  return passport.authenticate(provider, { session: false });
};
`;

  writeFileSync(join(authDir, 'middleware.ts'), middlewareFile);
}

function generateOAuthUtils(authDir: string, providers: string[]) {
  const utilsFile = `
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const linkOAuthAccount = async (userId: string, provider: string, oauthId: string) => {
  const updateData: any = {};
  updateData[\`\${provider}Id\`] = oauthId;
  
  return await prisma.user.update({
    where: { id: userId },
    data: updateData
  });
};

export const unlinkOAuthAccount = async (userId: string, provider: string) => {
  const updateData: any = {};
  updateData[\`\${provider}Id\`] = null;
  
  return await prisma.user.update({
    where: { id: userId },
    data: updateData
  });
};

export const getLinkedAccounts = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ${providers.map(p => `${p}Id: true`).join(',\n      ')}
    }
  });

  if (!user) return [];

  const linkedAccounts = [];
  ${providers.map(p => `
  if (user.${p}Id) linkedAccounts.push('${p}');`).join('')}
  
  return linkedAccounts;
};

export const findUserByOAuth = async (provider: string, oauthId: string) => {
  const whereClause: any = {};
  whereClause[\`\${provider}Id\`] = oauthId;
  
  return await prisma.user.findFirst({
    where: whereClause
  });
};
`;

  writeFileSync(join(authDir, 'oauth-utils.ts'), utilsFile);
}


export function updatePackageJsonForOAuth(packageJsonPath: string, providers: string[]) {
  const fs = require('fs');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  const oauthDependencies: Record<string, string> = {
    'passport': '^0.6.0',
    'express-session': '^1.17.3',
  };

  if (providers.includes('google')) {
    oauthDependencies['passport-google-oauth20'] = '^2.0.0';
  }
  if (providers.includes('github')) {
    oauthDependencies['passport-github2'] = '^0.1.12';
  }
  if (providers.includes('facebook')) {
    oauthDependencies['passport-facebook'] = '^3.0.0';
  }
  if (providers.includes('twitter')) {
    oauthDependencies['passport-twitter'] = '^1.0.4';
  }

  packageJson.dependencies = {
    ...packageJson.dependencies,
    ...oauthDependencies
  };

  // Add types for development
  const devDependencies: Record<string, string> = {
    '@types/passport': '^1.0.12',
    '@types/express-session': '^1.17.7',
  };

  if (providers.includes('google')) {
    devDependencies['@types/passport-google-oauth20'] = '^2.0.11';
  }
  if (providers.includes('github')) {
    devDependencies['@types/passport-github2'] = '^1.2.5';
  }
  if (providers.includes('facebook')) {
    devDependencies['@types/passport-facebook'] = '^3.0.0';
  }
  if (providers.includes('twitter')) {
    devDependencies['@types/passport-twitter'] = '^1.0.37';
  }

  packageJson.devDependencies = {
    ...packageJson.devDependencies,
    ...devDependencies
  };

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}