import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../utils/ApiError';
import { validateEntityName, validatePropertyName, validateRelationships } from '../utils/helpers';

// Validation schemas
const ValidationRuleSchema = z.union([
  z.object({ type: z.literal('minLength'), value: z.number().min(0) }),
  z.object({ type: z.literal('maxLength'), value: z.number().min(1) }),
  z.object({ type: z.literal('pattern'), value: z.string().min(1) }),
  z.object({ type: z.literal('min'), value: z.number() }),
  z.object({ type: z.literal('max'), value: z.number() }),
  z.object({ type: z.literal('email') }),
  z.object({ type: z.literal('url') }),
  z.object({ type: z.literal('uuid') }),
  z.object({ type: z.literal('enum'), values: z.array(z.string()).min(1) }),
  z.object({ type: z.literal('startsWith'), value: z.string().min(1) }),
  z.object({ type: z.literal('endsWith'), value: z.string().min(1) }),
  z.object({ type: z.literal('custom'), validator: z.string().min(1) })
]);

const PropertiesSchema = z.object({
  name: z.string().min(1),
  type: z.enum([
    'string', 'number', 'boolean', 'bigint', 'symbol', 'undefined',
    'null', 'object', 'array', 'function', 'date', 'any', 'unknown',
    'void', 'never', 'json', 'float', 'int', 'datetime', 'bytes', 'decimal'
  ]),
  nullable: z.boolean(),
  validation: z.array(ValidationRuleSchema).optional()
});

const RelationSchema = z.object({
  relation: z.enum(['one-to-one', 'one-to-many', 'many-to-many']),
  isParent: z.boolean(),
  controller: z.string().min(1)
});

const WorkflowSchema = z.object({
  name: z.string().min(1),
  props: z.array(PropertiesSchema).optional(),
  relations: z.array(RelationSchema).optional(),
  cardId: z.string().optional(),
  dimensions: z.object({
    width: z.number().optional(),
    height: z.number().optional()
  }).optional(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }).optional()
});

const CorsOptionsSchema = z.object({
  origin: z.union([
    z.boolean(),
    z.string(),
    z.instanceof(RegExp),
    z.array(z.union([z.string(), z.instanceof(RegExp)]))
  ]).optional(),
  methods: z.union([
    z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'CONNECT', 'TRACE']),
    z.array(z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'CONNECT', 'TRACE']))
  ]).optional(),
  allowedHeaders: z.union([
    z.string(),
    z.array(z.string())
  ]).optional(),
  exposedHeaders: z.union([
    z.string(),
    z.array(z.string())
  ]).optional(),
  credentials: z.boolean().optional(),
  maxAge: z.number().optional(),
  preflightContinue: z.boolean().optional(),
  optionsSuccessStatus: z.number().optional()
});

const ProjectFeaturesSchema = z.object({
  testDataSeeding: z.object({
    enabled: z.boolean(),
    recordCount: z.number().min(1).max(1000),
    locale: z.string().min(1),
    customSeed: z.boolean()
  }),
  apiDocumentation: z.object({
    enabled: z.boolean(),
    title: z.string(),
    description: z.string(),
    version: z.string().min(1),
    includeSwaggerUI: z.boolean()
  }),
  emailAuth: z.object({
    enabled: z.boolean(),
    provider: z.enum(['nodemailer', 'sendgrid', 'aws-ses']),
    templates: z.object({
      verification: z.boolean(),
      passwordReset: z.boolean(),
      welcome: z.boolean()
    })
  }),
  oauthProviders: z.object({
    enabled: z.boolean(),
    providers: z.array(z.enum(['google', 'github', 'facebook', 'twitter'])),
    callbackUrls: z.record(z.string())
  }),
  paymentIntegration: z.object({
    enabled: z.boolean(),
    provider: z.enum(['stripe', 'paypal', 'square']),
    features: z.array(z.enum(['subscriptions', 'one-time-payments', 'webhooks']))
  })
});

const WorkflowsSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(50),
  workflows: z.array(WorkflowSchema).min(1).max(20),
  cors: CorsOptionsSchema.optional(),
  features: ProjectFeaturesSchema.optional()
});

export const validateWorkflowRequest = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Basic schema validation
    const parsed = WorkflowsSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'Invalid request format', parsed.error.errors);
    }

    const workflows = req.body.workflows;
    const entityNames = new Set<string>();
    const validationErrors: string[] = [];

    // Validate each workflow
    for (const workflow of workflows) {
      // Check for duplicate entity names
      if (entityNames.has(workflow.name.toLowerCase())) {
        validationErrors.push(`Duplicate entity name: ${workflow.name}`);
        continue;
      }
      entityNames.add(workflow.name.toLowerCase());

      // Validate entity name
      const entityValidation = validateEntityName(workflow.name);
      if (!entityValidation.isValid) {
        validationErrors.push(`Entity "${workflow.name}": ${entityValidation.errors.join(', ')}`);
      }

      // Validate property names
      if (workflow.props) {
        const propertyNames = new Set<string>();
        
        for (const prop of workflow.props) {
          // Check for duplicate property names
          if (propertyNames.has(prop.name.toLowerCase())) {
            validationErrors.push(`Entity "${workflow.name}": Duplicate property name "${prop.name}"`);
            continue;
          }
          propertyNames.add(prop.name.toLowerCase());

          // Validate property name
          const propValidation = validatePropertyName(prop.name);
          if (!propValidation.isValid) {
            validationErrors.push(`Entity "${workflow.name}", Property "${prop.name}": ${propValidation.errors.join(', ')}`);
          }

          // Validate validation rules
          if (prop.validation) {
            for (const rule of prop.validation) {
              const ruleValidation = validateValidationRule(rule, prop.type);
              if (!ruleValidation.isValid) {
                validationErrors.push(`Entity "${workflow.name}", Property "${prop.name}": ${ruleValidation.errors.join(', ')}`);
              }
            }
          }
        }
      }

      // Validate relationships
      if (workflow.relations) {
        for (const relation of workflow.relations) {
          // Check if referenced entity exists
          if (!entityNames.has(relation.controller.toLowerCase()) && 
              !workflows.some((w: any) => w.name.toLowerCase() === relation.controller.toLowerCase())) {
            validationErrors.push(`Entity "${workflow.name}": Referenced entity "${relation.controller}" does not exist`);
          }
        }
      }
    }

    // Validate relationships for circular dependencies
    const allRelations = workflows.flatMap((w: any) => 
      (w.relations || []).map((r: any) => ({ ...r, entity: w.name }))
    );
    
    const relationValidation = validateRelationships(allRelations);
    if (!relationValidation.isValid) {
      validationErrors.push(...relationValidation.errors);
    }

    // Validate project name
    const projectValidation = validateEntityName(req.body.name);
    if (!projectValidation.isValid) {
      validationErrors.push(`Project name: ${projectValidation.errors.join(', ')}`);
    }

    if (validationErrors.length > 0) {
      throw new ApiError(400, 'Validation failed', validationErrors);
    }

    next();
  } catch (error) {
    next(error);
  }
};

function validateValidationRule(rule: any, propertyType: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (rule.type) {
    case 'minLength':
    case 'maxLength':
      if (propertyType !== 'string') {
        errors.push(`${rule.type} validation can only be applied to string properties`);
      }
      if (typeof rule.value !== 'number' || rule.value < 0) {
        errors.push(`${rule.type} value must be a non-negative number`);
      }
      break;

    case 'min':
    case 'max':
      if (!['number', 'int', 'float', 'date', 'datetime'].includes(propertyType)) {
        errors.push(`${rule.type} validation can only be applied to number or date properties`);
      }
      if (typeof rule.value !== 'number') {
        errors.push(`${rule.type} value must be a number`);
      }
      break;

    case 'email':
    case 'url':
    case 'uuid':
      if (propertyType !== 'string') {
        errors.push(`${rule.type} validation can only be applied to string properties`);
      }
      break;

    case 'pattern':
      if (propertyType !== 'string') {
        errors.push('Pattern validation can only be applied to string properties');
      }
      try {
        new RegExp(rule.value);
      } catch {
        errors.push('Invalid regex pattern');
      }
      break;

    case 'enum':
      if (!Array.isArray(rule.values) || rule.values.length === 0) {
        errors.push('Enum validation must have at least one value');
      }
      break;

    case 'startsWith':
    case 'endsWith':
      if (propertyType !== 'string') {
        errors.push(`${rule.type} validation can only be applied to string properties`);
      }
      if (typeof rule.value !== 'string' || rule.value.length === 0) {
        errors.push(`${rule.type} value must be a non-empty string`);
      }
      break;

    case 'custom':
      if (typeof rule.validator !== 'string' || rule.validator.length === 0) {
        errors.push('Custom validation must have a validator function name');
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export const validateRequestParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.safeParse(req.params);
      if (!parsed.success) {
        throw new ApiError(400, 'Invalid request parameters', parsed.error.errors);
      }
      req.params = parsed.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateRequestQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.safeParse(req.query);
      if (!parsed.success) {
        throw new ApiError(400, 'Invalid query parameters', parsed.error.errors);
      }
      req.query = parsed.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateRequestBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiError(400, 'Invalid request body', parsed.error.errors);
      }
      req.body = parsed.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};