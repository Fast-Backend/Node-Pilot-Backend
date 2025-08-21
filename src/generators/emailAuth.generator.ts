import fs from 'fs-extra';
import path from 'path';
import { capitalize } from '../utils/helpers';
import { ProjectFeatures } from '../types/workflow';

interface EmailAuthOptions {
  baseDir: string;
  projectName: string;
  provider: 'nodemailer' | 'sendgrid' | 'resend';
  templates: {
    verification: boolean;
    passwordReset: boolean;
    welcome: boolean;
  };
}

export async function generateEmailAuth({ baseDir, projectName, provider, templates }: EmailAuthOptions): Promise<void> {
  // Add dependencies to package.json
  await addEmailAuthDependencies(baseDir, provider);
  
  // Generate User model for authentication
  await generateUserModel(baseDir);
  
  // Generate JWT utilities
  await generateJWTUtils(baseDir);
  
  // Generate email service
  await generateEmailService(baseDir, provider, templates);
  
  // Generate auth middleware
  await generateAuthMiddleware(baseDir);
  
  // Generate auth controllers
  await generateAuthControllers(baseDir, templates);
  
  // Generate auth routes
  await generateAuthRoutes(baseDir);
  
  // Generate email templates
  if (templates.verification || templates.passwordReset || templates.welcome) {
    await generateEmailTemplates(baseDir, templates);
  }
  
  // Update environment variables
  await updateEnvironmentVariables(baseDir, provider);
  
  // Generate auth documentation
  await generateAuthDocumentation(baseDir, projectName);
}

async function addEmailAuthDependencies(baseDir: string, provider: 'nodemailer' | 'sendgrid' | 'resend'): Promise<void> {
  const packageJsonPath = path.join(baseDir, 'package.json');
  
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);
    
    packageJson.dependencies = packageJson.dependencies || {};
    packageJson.devDependencies = packageJson.devDependencies || {};
    
    // Core auth dependencies
    packageJson.dependencies['bcryptjs'] = '^2.4.3';
    packageJson.dependencies['jsonwebtoken'] = '^9.0.2';
    packageJson.dependencies['express-rate-limit'] = '^7.1.5';
    packageJson.dependencies['express-validator'] = '^7.0.1';
    packageJson.dependencies['crypto'] = '^1.0.1';
    
    // Type definitions
    packageJson.devDependencies['@types/bcryptjs'] = '^2.4.6';
    packageJson.devDependencies['@types/jsonwebtoken'] = '^9.0.5';
    
    // Provider-specific dependencies
    switch (provider) {
      case 'nodemailer':
        packageJson.dependencies['nodemailer'] = '^6.9.7';
        packageJson.devDependencies['@types/nodemailer'] = '^6.4.14';
        break;
      case 'sendgrid':
        packageJson.dependencies['@sendgrid/mail'] = '^8.1.0';
        break;
      case 'resend':
        packageJson.dependencies['resend'] = '^2.1.0';
        break;
    }
    
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  }
}

async function generateUserModel(baseDir: string): Promise<void> {
  const userModelContent = `export interface User {
  id: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetTokenExpiry?: Date;
  refreshToken?: string;
  lastLoginAt?: Date;
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

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified: boolean;
}
`;

  const userTypesPath = path.join(baseDir, 'src/types');
  await fs.ensureDir(userTypesPath);
  await fs.writeFile(path.join(userTypesPath, 'auth.ts'), userModelContent);
}

async function generateJWTUtils(baseDir: string): Promise<void> {
  const jwtUtilsContent = `import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ApiError } from './ApiError';

interface JWTPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh' | 'verification' | 'reset';
}

export class JWTService {
  private static readonly ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key';
  private static readonly REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  private static readonly ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

  static generateAccessToken(userId: string, email: string): string {
    const payload: JWTPayload = {
      userId,
      email,
      type: 'access',
    };

    return jwt.sign(payload, this.ACCESS_TOKEN_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      issuer: 'your-app-name',
      audience: 'your-app-users',
    } as jwt.SignOptions);
  }

  static generateRefreshToken(userId: string, email: string): string {
    const payload: JWTPayload = {
      userId,
      email,
      type: 'refresh',
    };

    return jwt.sign(payload, this.REFRESH_TOKEN_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
      issuer: 'your-app-name',
      audience: 'your-app-users',
    } as jwt.SignOptions);
  }

  static generateEmailVerificationToken(userId: string, email: string): string {
    const payload: JWTPayload = {
      userId,
      email,
      type: 'verification',
    };

    return jwt.sign(payload, this.ACCESS_TOKEN_SECRET, {
      expiresIn: '24h',
      issuer: 'your-app-name',
      audience: 'your-app-users',
    } as jwt.SignOptions);
  }

  static generatePasswordResetToken(userId: string, email: string): string {
    const payload: JWTPayload = {
      userId,
      email,
      type: 'reset',
    };

    return jwt.sign(payload, this.ACCESS_TOKEN_SECRET, {
      expiresIn: '1h',
      issuer: 'your-app-name',
      audience: 'your-app-users',
    } as jwt.SignOptions);
  }

  static verifyAccessToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, this.ACCESS_TOKEN_SECRET) as JWTPayload;
      
      if (payload.type !== 'access') {
        throw new ApiError(401, 'Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new ApiError(401, 'Access token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new ApiError(401, 'Invalid access token');
      }
      throw error;
    }
  }

  static verifyRefreshToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, this.REFRESH_TOKEN_SECRET) as JWTPayload;
      
      if (payload.type !== 'refresh') {
        throw new ApiError(401, 'Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new ApiError(401, 'Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new ApiError(401, 'Invalid refresh token');
      }
      throw error;
    }
  }

  static verifyEmailToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, this.ACCESS_TOKEN_SECRET) as JWTPayload;
      
      if (payload.type !== 'verification') {
        throw new ApiError(400, 'Invalid verification token');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new ApiError(400, 'Verification token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new ApiError(400, 'Invalid verification token');
      }
      throw error;
    }
  }

  static verifyResetToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, this.ACCESS_TOKEN_SECRET) as JWTPayload;
      
      if (payload.type !== 'reset') {
        throw new ApiError(400, 'Invalid reset token');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new ApiError(400, 'Reset token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new ApiError(400, 'Invalid reset token');
      }
      throw error;
    }
  }

  static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
`;

  const utilsPath = path.join(baseDir, 'src/utils');
  await fs.ensureDir(utilsPath);
  await fs.writeFile(path.join(utilsPath, 'jwt.ts'), jwtUtilsContent);
}

async function generateEmailService(
  baseDir: string, 
  provider: 'nodemailer' | 'sendgrid' | 'resend',
  templates: { verification: boolean; passwordReset: boolean; welcome: boolean; }
): Promise<void> {
  let serviceContent = '';

  switch (provider) {
    case 'nodemailer':
      serviceContent = generateNodemailerService(templates);
      break;
    case 'sendgrid':
      serviceContent = generateSendGridService(templates);
      break;
    case 'resend':
      serviceContent = generateResendService(templates);
      break;
  }

  const servicesPath = path.join(baseDir, 'src/services');
  await fs.ensureDir(servicesPath);
  await fs.writeFile(path.join(servicesPath, 'email.service.ts'), serviceContent);
}

function generateNodemailerService(templates: { verification: boolean; passwordReset: boolean; welcome: boolean; }): string {
  return `import nodemailer from 'nodemailer';
import { ApiError } from '../utils/ApiError';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  static async sendEmail({ to, subject, html, text }: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html,
        text: text || '',
      });
    } catch (error) {
      console.error('Email send error:', error);
      throw new ApiError(500, 'Failed to send email');
    }
  }

${templates.verification ? `
  static async sendVerificationEmail(email: string, verificationToken: string, userName?: string): Promise<void> {
    const verificationUrl = \`\${process.env.FRONTEND_URL}/verify-email?token=\${verificationToken}\`;
    
    const subject = 'Verify Your Email Address';
    const html = \`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome\${userName ? \` \${userName}\` : ''}!</h2>
        <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="\${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="color: #007bff; word-break: break-all;">\${verificationUrl}</p>
        <p style="color: #999; font-size: 12px;">This link will expire in 24 hours.</p>
      </div>
    \`;

    await this.sendEmail({ to: email, subject, html });
  }
` : ''}

${templates.passwordReset ? `
  static async sendPasswordResetEmail(email: string, resetToken: string, userName?: string): Promise<void> {
    const resetUrl = \`\${process.env.FRONTEND_URL}/reset-password?token=\${resetToken}\`;
    
    const subject = 'Reset Your Password';
    const html = \`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi\${userName ? \` \${userName}\` : ''},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="\${resetUrl}" 
             style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666;">If you didn't request this, you can safely ignore this email.</p>
        <p style="color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="color: #007bff; word-break: break-all;">\${resetUrl}</p>
        <p style="color: #999; font-size: 12px;">This link will expire in 1 hour.</p>
      </div>
    \`;

    await this.sendEmail({ to: email, subject, html });
  }
` : ''}

${templates.welcome ? `
  static async sendWelcomeEmail(email: string, userName?: string): Promise<void> {
    const subject = 'Welcome to Our Platform!';
    const html = \`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome\${userName ? \` \${userName}\` : ''}!</h2>
        <p>We're excited to have you on board. Your account has been successfully created and verified.</p>
        <p>Here are some things you can do to get started:</p>
        <ul style="color: #666;">
          <li>Complete your profile</li>
          <li>Explore our features</li>
          <li>Connect with other users</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="\${process.env.FRONTEND_URL}/dashboard" 
             style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Get Started
          </a>
        </div>
        <p style="color: #666;">If you have any questions, feel free to reach out to our support team.</p>
      </div>
    \`;

    await this.sendEmail({ to: email, subject, html });
  }
` : ''}
}
`;
}

function generateSendGridService(templates: { verification: boolean; passwordReset: boolean; welcome: boolean; }): string {
  return `import sgMail from '@sendgrid/mail';
import { ApiError } from '../utils/ApiError';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  static async sendEmail({ to, subject, html, text }: EmailOptions): Promise<void> {
    try {
      await sgMail.send({
        to,
        from: process.env.SENDGRID_FROM_EMAIL || '',
        subject,
        html,
        text: text || '',
      });
    } catch (error) {
      console.error('SendGrid error:', error);
      throw new ApiError(500, 'Failed to send email');
    }
  }

${templates.verification ? `
  static async sendVerificationEmail(email: string, verificationToken: string, userName?: string): Promise<void> {
    const verificationUrl = \`\${process.env.FRONTEND_URL}/verify-email?token=\${verificationToken}\`;
    
    const subject = 'Verify Your Email Address';
    const html = \`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome\${userName ? \` \${userName}\` : ''}!</h2>
        <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="\${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="color: #007bff; word-break: break-all;">\${verificationUrl}</p>
        <p style="color: #999; font-size: 12px;">This link will expire in 24 hours.</p>
      </div>
    \`;

    await this.sendEmail({ to: email, subject, html });
  }
` : ''}

${templates.passwordReset ? `
  static async sendPasswordResetEmail(email: string, resetToken: string, userName?: string): Promise<void> {
    const resetUrl = \`\${process.env.FRONTEND_URL}/reset-password?token=\${resetToken}\`;
    
    const subject = 'Reset Your Password';
    const html = \`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi\${userName ? \` \${userName}\` : ''},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="\${resetUrl}" 
             style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666;">If you didn't request this, you can safely ignore this email.</p>
        <p style="color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="color: #007bff; word-break: break-all;">\${resetUrl}</p>
        <p style="color: #999; font-size: 12px;">This link will expire in 1 hour.</p>
      </div>
    \`;

    await this.sendEmail({ to: email, subject, html });
  }
` : ''}

${templates.welcome ? `
  static async sendWelcomeEmail(email: string, userName?: string): Promise<void> {
    const subject = 'Welcome to Our Platform!';
    const html = \`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome\${userName ? \` \${userName}\` : ''}!</h2>
        <p>We're excited to have you on board. Your account has been successfully created and verified.</p>
        <p>Here are some things you can do to get started:</p>
        <ul style="color: #666;">
          <li>Complete your profile</li>
          <li>Explore our features</li>
          <li>Connect with other users</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="\${process.env.FRONTEND_URL}/dashboard" 
             style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Get Started
          </a>
        </div>
        <p style="color: #666;">If you have any questions, feel free to reach out to our support team.</p>
      </div>
    \`;

    await this.sendEmail({ to: email, subject, html });
  }
` : ''}
}
`;
}

function generateResendService(templates: { verification: boolean; passwordReset: boolean; welcome: boolean; }): string {
  return `import { Resend } from 'resend';
import { ApiError } from '../utils/ApiError';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  static async sendEmail({ to, subject, html, text }: EmailOptions): Promise<void> {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
        to,
        subject,
        html,
        text,
      });
    } catch (error) {
      console.error('Resend error:', error);
      throw new ApiError(500, 'Failed to send email');
    }
  }

${templates.verification ? `
  static async sendVerificationEmail(email: string, verificationToken: string, userName?: string): Promise<void> {
    const verificationUrl = \`\${process.env.FRONTEND_URL}/verify-email?token=\${verificationToken}\`;
    
    const subject = 'Verify Your Email Address';
    const html = \`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome\${userName ? \` \${userName}\` : ''}!</h2>
        <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="\${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="color: #007bff; word-break: break-all;">\${verificationUrl}</p>
        <p style="color: #999; font-size: 12px;">This link will expire in 24 hours.</p>
      </div>
    \`;

    await this.sendEmail({ to: email, subject, html });
  }
` : ''}

${templates.passwordReset ? `
  static async sendPasswordResetEmail(email: string, resetToken: string, userName?: string): Promise<void> {
    const resetUrl = \`\${process.env.FRONTEND_URL}/reset-password?token=\${resetToken}\`;
    
    const subject = 'Reset Your Password';
    const html = \`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi\${userName ? \` \${userName}\` : ''},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="\${resetUrl}" 
             style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666;">If you didn't request this, you can safely ignore this email.</p>
        <p style="color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="color: #007bff; word-break: break-all;">\${resetUrl}</p>
        <p style="color: #999; font-size: 12px;">This link will expire in 1 hour.</p>
      </div>
    \`;

    await this.sendEmail({ to: email, subject, html });
  }
` : ''}

${templates.welcome ? `
  static async sendWelcomeEmail(email: string, userName?: string): Promise<void> {
    const subject = 'Welcome to Our Platform!';
    const html = \`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome\${userName ? \` \${userName}\` : ''}!</h2>
        <p>We're excited to have you on board. Your account has been successfully created and verified.</p>
        <p>Here are some things you can do to get started:</p>
        <ul style="color: #666;">
          <li>Complete your profile</li>
          <li>Explore our features</li>
          <li>Connect with other users</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="\${process.env.FRONTEND_URL}/dashboard" 
             style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Get Started
          </a>
        </div>
        <p style="color: #666;">If you have any questions, feel free to reach out to our support team.</p>
      </div>
    \`;

    await this.sendEmail({ to: email, subject, html });
  }
` : ''}
}
`;
}

async function generateAuthMiddleware(baseDir: string): Promise<void> {
  const middlewareContent = `import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { JWTService } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        userId?: string; // For compatibility with JWT payloads
      };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Access token required');
    }

    const token = authHeader.split(' ')[1];
    const payload = JWTService.verifyAccessToken(token);
    
    req.user = {
      id: payload.userId,
      userId: payload.userId, // For compatibility
      email: payload.email,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = JWTService.verifyAccessToken(token);
      
      req.user = {
        id: payload.userId,
        userId: payload.userId, // For compatibility
        email: payload.email,
      };
    }

    next();
  } catch (error) {
    // For optional auth, we don't throw errors, just continue without user
    next();
  }
};

// Rate limiting for auth endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for password reset
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many password reset attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for email verification
export const emailVerificationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 verification emails per hour
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many verification emails sent, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
`;

  const middlewarePath = path.join(baseDir, 'src/middleware');
  await fs.ensureDir(middlewarePath);
  await fs.writeFile(path.join(middlewarePath, 'auth.ts'), middlewareContent);
}

async function generateAuthControllers(baseDir: string, templates?: { verification: boolean; passwordReset: boolean; welcome: boolean }): Promise<void> {
  const controllersContent = `import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { JWTService } from '../utils/jwt';
import { EmailService } from '../services/email.service';
import { ApiError } from '../utils/ApiError';
import { catchAsync } from '../utils/catchAsync';
import { sendResponse } from '../utils/response';
import { RegisterUserData, LoginUserData, AuthTokens, AuthUser } from '../types/auth';

export class AuthController {
  // Validation rules
  static registerValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name cannot be empty'),
    body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name cannot be empty'),
  ];

  static loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ];

  static resetPasswordValidation = [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  ];

  // Register new user
  static register = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { email, password, firstName, lastName }: RegisterUserData = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification token
    const verificationToken = JWTService.generateEmailVerificationToken('temp-id', email);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        isEmailVerified: false,
        emailVerificationToken: verificationToken,
      },
    });

    // Send verification email
    try {
      await EmailService.sendVerificationEmail(email, verificationToken, firstName);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't fail registration if email fails
    }

    // Generate tokens
    const accessToken = JWTService.generateAccessToken(user.id, email);
    const refreshToken = JWTService.generateRefreshToken(user.id, email);

    // Save refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isEmailVerified: user.isEmailVerified,
    };

    const tokens: AuthTokens = { accessToken, refreshToken };

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      data: { user: authUser, tokens },
    });
  });

  // Login user
  static login = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { email, password }: LoginUserData = req.body;

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Generate tokens
    const accessToken = JWTService.generateAccessToken(user.id, email);
    const refreshToken = JWTService.generateRefreshToken(user.id, email);

    // Update user with new refresh token and last login
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        refreshToken,
        lastLoginAt: new Date(),
      },
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isEmailVerified: user.isEmailVerified,
    };

    const tokens: AuthTokens = { accessToken, refreshToken };

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Login successful',
      data: { user: authUser, tokens },
    });
  });

  // Refresh access token
  static refreshToken = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ApiError(401, 'Refresh token is required');
    }

    // Verify refresh token
    const payload = JWTService.verifyRefreshToken(refreshToken);

    // Find user and verify refresh token
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.refreshToken !== refreshToken) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    // Generate new tokens
    const newAccessToken = JWTService.generateAccessToken(user.id, user.email);
    const newRefreshToken = JWTService.generateRefreshToken(user.id, user.email);

    // Update refresh token in database
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    const tokens: AuthTokens = { 
      accessToken: newAccessToken, 
      refreshToken: newRefreshToken 
    };

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Token refreshed successfully',
      data: { tokens },
    });
  });

  // Verify email
  static verifyEmail = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body;

    if (!token) {
      throw new ApiError(400, 'Verification token is required');
    }

    // Verify token
    const payload = JWTService.verifyEmailToken(token);

    // Find user
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.isEmailVerified) {
      throw new ApiError(400, 'Email is already verified');
    }

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
      },
    });

${templates?.welcome ? `
    // Send welcome email
    try {
      await EmailService.sendWelcomeEmail(user.email, user.firstName);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }` : ''}

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Email verified successfully',
    });
  });

  // Resend verification email
  static resendVerification = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    if (!email) {
      throw new ApiError(400, 'Email is required');
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.isEmailVerified) {
      throw new ApiError(400, 'Email is already verified');
    }

    // Generate new verification token
    const verificationToken = JWTService.generateEmailVerificationToken(user.id, email);

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken: verificationToken },
    });

    // Send verification email
    await EmailService.sendVerificationEmail(email, verificationToken, user.firstName);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Verification email sent successfully',
    });
  });

  // Request password reset
  static requestPasswordReset = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    if (!email) {
      throw new ApiError(400, 'Email is required');
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if user exists or not
      sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      });
      return;
    }

    // Generate reset token
    const resetToken = JWTService.generatePasswordResetToken(user.id, email);

    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send reset email
    await EmailService.sendPasswordResetEmail(email, resetToken, user.firstName);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'If the email exists, a password reset link has been sent',
    });
  });

  // Reset password
  static resetPassword = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { token, password } = req.body;

    // Verify reset token
    const payload = JWTService.verifyResetToken(token);

    // Find user
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.passwordResetToken !== token) {
      throw new ApiError(400, 'Invalid or expired reset token');
    }

    // Check if token is expired
    if (user.passwordResetTokenExpiry && user.passwordResetTokenExpiry < new Date()) {
      throw new ApiError(400, 'Reset token has expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
        refreshToken: null, // Invalidate all sessions
      },
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Password reset successfully',
    });
  });

  // Logout user
  static logout = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (userId) {
      // Invalidate refresh token
      await prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      });
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Logged out successfully',
    });
  });

  // Get current user profile
  static getProfile = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Profile retrieved successfully',
      data: { user },
    });
  });
}
`;

  const controllersPath = path.join(baseDir, 'src/controllers');
  await fs.ensureDir(controllersPath);
  await fs.writeFile(path.join(controllersPath, 'auth.controller.ts'), controllersContent);
}

async function generateAuthRoutes(baseDir: string): Promise<void> {
  const routesContent = `import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { 
  authenticate, 
  authRateLimit, 
  passwordResetRateLimit, 
  emailVerificationRateLimit 
} from '../middleware/auth';

const router = Router();

// Public routes with rate limiting
router.post('/register', authRateLimit, AuthController.registerValidation, AuthController.register);
router.post('/login', authRateLimit, AuthController.loginValidation, AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);

// Email verification routes
router.post('/verify-email', emailVerificationRateLimit, AuthController.verifyEmail);
router.post('/resend-verification', emailVerificationRateLimit, AuthController.resendVerification);

// Password reset routes
router.post('/request-password-reset', passwordResetRateLimit, AuthController.requestPasswordReset);
router.post('/reset-password', AuthController.resetPasswordValidation, AuthController.resetPassword);

// Protected routes
router.post('/logout', authenticate, AuthController.logout);
router.get('/profile', authenticate, AuthController.getProfile);

export default router;
`;

  const routesPath = path.join(baseDir, 'src/routes');
  await fs.ensureDir(routesPath);
  await fs.writeFile(path.join(routesPath, 'auth.routes.ts'), routesContent);
}

async function generateEmailTemplates(
  baseDir: string,
  templates: { verification: boolean; passwordReset: boolean; welcome: boolean; }
): Promise<void> {
  const templatesPath = path.join(baseDir, 'src/templates/email');
  await fs.ensureDir(templatesPath);

  if (templates.verification) {
    const verificationTemplate = `export const verificationEmailTemplate = (verificationUrl: string, userName?: string) => ({
  subject: 'Verify Your Email Address',
  html: \`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: #007bff; margin-bottom: 30px;">Welcome\${userName ? \` \${userName}\` : ''}!</h1>
          
          <div style="background-color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #333; margin-bottom: 20px;">Verify Your Email Address</h2>
            <p style="margin-bottom: 30px; color: #666;">
              Thank you for signing up! To complete your registration and secure your account, 
              please verify your email address by clicking the button below.
            </p>
            
            <a href="\${verificationUrl}" 
               style="display: inline-block; background-color: #007bff; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 5px; font-weight: bold; margin-bottom: 30px;">
              Verify Email Address
            </a>
            
            <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="color: #007bff; word-break: break-all; background-color: #f8f9fa; 
                      padding: 10px; border-radius: 4px; font-size: 12px;">
              \${verificationUrl}
            </p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              ⚠️ This verification link will expire in 24 hours for security reasons.
            </p>
          </div>
          
          <p style="color: #666; font-size: 12px; margin: 0;">
            If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  \`,
  text: \`
    Welcome\${userName ? \` \${userName}\` : ''}!
    
    Thank you for signing up! Please verify your email address by visiting:
    \${verificationUrl}
    
    This link will expire in 24 hours.
    
    If you didn't create an account, you can safely ignore this email.
  \`
});
`;

    await fs.writeFile(path.join(templatesPath, 'verification.ts'), verificationTemplate);
  }

  if (templates.passwordReset) {
    const resetTemplate = `export const passwordResetEmailTemplate = (resetUrl: string, userName?: string) => ({
  subject: 'Reset Your Password',
  html: \`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
          <h1 style="color: #dc3545; margin-bottom: 30px; text-align: center;">Password Reset Request</h1>
          
          <div style="background-color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hi\${userName ? \` \${userName}\` : ''},</h2>
            <p style="margin-bottom: 20px; color: #666;">
              We received a request to reset the password for your account. If you made this request, 
              click the button below to create a new password.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="\${resetUrl}" 
                 style="display: inline-block; background-color: #dc3545; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; font-weight: bold;">
                Reset My Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="color: #dc3545; word-break: break-all; background-color: #f8f9fa; 
                      padding: 10px; border-radius: 4px; font-size: 12px;">
              \${resetUrl}
            </p>
          </div>
          
          <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <p style="color: #0c5460; margin: 0; font-size: 14px;">
              🔒 This password reset link will expire in 1 hour for security reasons.
            </p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              ⚠️ If you didn't request a password reset, please ignore this email or contact support 
              if you have concerns about your account security.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  \`,
  text: \`
    Password Reset Request
    
    Hi\${userName ? \` \${userName}\` : ''},
    
    We received a request to reset your password. If you made this request, visit:
    \${resetUrl}
    
    This link will expire in 1 hour.
    
    If you didn't request a password reset, please ignore this email.
  \`
});
`;

    await fs.writeFile(path.join(templatesPath, 'passwordReset.ts'), resetTemplate);
  }

  if (templates.welcome) {
    const welcomeTemplate = `export const welcomeEmailTemplate = (userName?: string) => ({
  subject: 'Welcome to Our Platform!',
  html: \`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome!</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: #28a745; margin-bottom: 30px;">Welcome\${userName ? \` \${userName}\` : ''}! 🎉</h1>
          
          <div style="background-color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #333; margin-bottom: 20px;">Your Account is Ready!</h2>
            <p style="margin-bottom: 30px; color: #666;">
              Congratulations! Your email has been verified and your account is now fully activated. 
              We're excited to have you on board!
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 30px;">
              <h3 style="color: #333; margin-bottom: 15px;">Here's what you can do next:</h3>
              <ul style="text-align: left; color: #666; padding-left: 20px;">
                <li style="margin-bottom: 10px;">Complete your profile with additional details</li>
                <li style="margin-bottom: 10px;">Explore our features and tools</li>
                <li style="margin-bottom: 10px;">Connect with other users in the community</li>
                <li style="margin-bottom: 10px;">Set up your preferences and notifications</li>
              </ul>
            </div>
            
            <a href="\${process.env.FRONTEND_URL}/dashboard" 
               style="display: inline-block; background-color: #28a745; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 5px; font-weight: bold; margin-bottom: 30px;">
              Get Started Now
            </a>
          </div>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #155724; margin-bottom: 10px;">Need Help?</h3>
            <p style="color: #155724; margin: 0; font-size: 14px;">
              If you have any questions or need assistance, our support team is here to help. 
              Feel free to reach out anytime!
            </p>
          </div>
          
          <p style="color: #666; font-size: 12px; margin: 0;">
            Thank you for choosing our platform. We look forward to seeing what you'll accomplish!
          </p>
        </div>
      </div>
    </body>
    </html>
  \`,
  text: \`
    Welcome\${userName ? \` \${userName}\` : ''}!
    
    Congratulations! Your account is now fully activated.
    
    Here's what you can do next:
    - Complete your profile
    - Explore our features
    - Connect with other users
    - Set up your preferences
    
    Get started: \${process.env.FRONTEND_URL}/dashboard
    
    If you need help, our support team is here for you!
  \`
});
`;

    await fs.writeFile(path.join(templatesPath, 'welcome.ts'), welcomeTemplate);
  }
}

async function updateEnvironmentVariables(baseDir: string, provider: 'nodemailer' | 'sendgrid' | 'resend'): Promise<void> {
  const envPath = path.join(baseDir, '.env');
  
  let envContent = '';
  
  if (await fs.pathExists(envPath)) {
    envContent = await fs.readFile(envPath, 'utf8');
  }
  
  // Add JWT secrets if not present
  if (!envContent.includes('JWT_ACCESS_SECRET')) {
    envContent += `\n# JWT Configuration
JWT_ACCESS_SECRET=your-super-secret-access-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d\n`;
  }
  
  // Add frontend URL if not present
  if (!envContent.includes('FRONTEND_URL')) {
    envContent += `\n# Frontend URL for email links
FRONTEND_URL=http://localhost:3000\n`;
  }
  
  // Add provider-specific environment variables
  switch (provider) {
    case 'nodemailer':
      if (!envContent.includes('SMTP_HOST')) {
        envContent += `\n# Nodemailer SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com\n`;
      }
      break;
    case 'sendgrid':
      if (!envContent.includes('SENDGRID_API_KEY')) {
        envContent += `\n# SendGrid Configuration
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com\n`;
      }
      break;
    case 'resend':
      if (!envContent.includes('RESEND_API_KEY')) {
        envContent += `\n# Resend Configuration
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@yourdomain.com\n`;
      }
      break;
  }
  
  await fs.writeFile(envPath, envContent);
}

async function generateAuthDocumentation(baseDir: string, projectName: string): Promise<void> {
  const docContent = `# ${projectName} - Authentication Documentation

## Overview

This project includes a complete email-based authentication system with the following features:

- User registration with email verification
- Secure login with JWT tokens
- Password reset functionality
- Email templates for verification, password reset, and welcome messages
- Rate limiting for security
- Comprehensive validation
- Refresh token support

## API Endpoints

### Authentication Routes

All authentication routes are available under \`/api/auth\`:

#### Register User
\`\`\`http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
\`\`\`

#### Login User
\`\`\`http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
\`\`\`

#### Refresh Token
\`\`\`http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
\`\`\`

#### Verify Email
\`\`\`http
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "verification-token-from-email"
}
\`\`\`

#### Request Password Reset
\`\`\`http
POST /api/auth/request-password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}
\`\`\`

#### Reset Password
\`\`\`http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "password": "NewSecurePassword123!"
}
\`\`\`

#### Get User Profile
\`\`\`http
GET /api/auth/profile
Authorization: Bearer your-access-token
\`\`\`

#### Logout
\`\`\`http
POST /api/auth/logout
Authorization: Bearer your-access-token
\`\`\`

## Environment Variables

Make sure to set these environment variables in your \`.env\` file:

### JWT Configuration
\`\`\`env
JWT_ACCESS_SECRET=your-super-secret-access-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
\`\`\`

### Frontend URL
\`\`\`env
FRONTEND_URL=http://localhost:3000
\`\`\`

### Email Provider Configuration

#### For Nodemailer (SMTP)
\`\`\`env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
\`\`\`

#### For SendGrid
\`\`\`env
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
\`\`\`

#### For Resend
\`\`\`env
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@yourdomain.com
\`\`\`

## Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Rate Limiting
- Authentication endpoints: 5 requests per 15 minutes
- Password reset: 3 requests per hour
- Email verification: 5 requests per hour

### Token Security
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Email verification tokens expire in 24 hours
- Password reset tokens expire in 1 hour

## Database Schema

The authentication system adds the following fields to your User model:

\`\`\`prisma
model User {
  id                        String    @id @default(cuid())
  email                     String    @unique
  password                  String
  firstName                 String?
  lastName                  String?
  isEmailVerified           Boolean   @default(false)
  emailVerificationToken    String?
  passwordResetToken        String?
  passwordResetTokenExpiry  DateTime?
  refreshToken              String?
  lastLoginAt               DateTime?
  createdAt                 DateTime  @default(now())
  updatedAt                 DateTime  @updatedAt
}
\`\`\`

## Frontend Integration

### Setting up Protected Routes

\`\`\`typescript
// Example React authentication context
const AuthContext = createContext<{
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}>({});

// Example protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return <>{children}</>;
};
\`\`\`

### Handling Token Refresh

\`\`\`typescript
// Example Axios interceptor for automatic token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post('/api/auth/refresh-token', {
          refreshToken
        });
        
        const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        error.config.headers.Authorization = \`Bearer \${accessToken}\`;
        return axios.request(error.config);
      } catch (refreshError) {
        // Redirect to login
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);
\`\`\`

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check your email provider configuration
   - Verify API keys or SMTP credentials
   - Check spam/junk folders

2. **Token expiration errors**
   - Implement automatic token refresh
   - Check system clock synchronization

3. **Rate limiting issues**
   - Implement exponential backoff
   - Display appropriate error messages to users

### Testing Authentication

Use tools like Postman or curl to test the authentication endpoints:

\`\`\`bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com","password":"TestPassword123!","firstName":"Test"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com","password":"TestPassword123!"}'
\`\`\`

## Best Practices

1. **Always use HTTPS in production**
2. **Store JWT secrets securely**
3. **Implement proper CORS policies**
4. **Use strong password requirements**
5. **Monitor for suspicious authentication activity**
6. **Regularly rotate JWT secrets**
7. **Implement account lockout after failed attempts**

For more information, refer to the generated code comments and type definitions.
`;

  const docsPath = path.join(baseDir, 'docs');
  await fs.ensureDir(docsPath);
  await fs.writeFile(path.join(docsPath, 'AUTHENTICATION.md'), docContent);
}