import { Properties, Relation } from '../types/workflow';

export interface ControllerTemplate {
  imports: string;
  class: string;
  methods: {
    getAll: string;
    getById: string;
    create: string;
    update: string;
    delete: string;
  };
}

export const generateControllerTemplate = (
  name: string,
  properties?: Properties[],
  relations?: Relation[]
): ControllerTemplate => {
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
  const serviceName = `${capitalizedName}Service`;
  const typeName = `${capitalizedName}Type`;

  const hasValidation = properties && properties.length > 0;
  const hasRelations = relations && relations.length > 0;

  const imports = `import { Request, Response } from 'express';
${hasValidation ? `import { z } from 'zod';` : ''}
import { ${typeName} } from '../types/${name}';
import { ${serviceName} } from '../services/${name}.service';
${hasRelations ? `import prisma from '../lib/prisma';` : ''}
import { ApiError } from '../utils/ApiError';
import { catchAsync } from '../utils/catchAsync';
import { sendResponse } from '../utils/response';`;

  const methods = {
    getAll: `export const getAll${capitalizedName} = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await ${serviceName}.getAll(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: '${capitalizedName} retrieved successfully',
    data: result.data,
    meta: result.meta
  });
});`,

    getById: `export const get${capitalizedName}ById = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await ${serviceName}.getById(id);
  
  if (!result) {
    throw new ApiError(404, '${capitalizedName} not found');
  }
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: '${capitalizedName} retrieved successfully',
    data: result
  });
});`,

    create: hasValidation ? 
      generateCreateWithValidation(name, capitalizedName, serviceName, properties!, relations) :
      generateCreateWithoutValidation(name, capitalizedName, serviceName),

    update: `export const update${capitalizedName} = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await ${serviceName}.update(id, req.body);
  
  if (!result) {
    throw new ApiError(404, '${capitalizedName} not found');
  }
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: '${capitalizedName} updated successfully',
    data: result
  });
});`,

    delete: `export const delete${capitalizedName} = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await ${serviceName}.delete(id);
  
  if (!result) {
    throw new ApiError(404, '${capitalizedName} not found');
  }
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: '${capitalizedName} deleted successfully'
  });
});`
  };

  return {
    imports,
    class: '',
    methods
  };
};

function generateCreateWithValidation(
  name: string,
  capitalizedName: string,
  serviceName: string,
  properties: Properties[],
  relations?: Relation[]
): string {
  const zodSchema = properties
    .map((prop) => `  ${prop.name}: ${mapZodType(prop)}`)
    .join(',\n');

  const relationValidation = relations?.filter(r => !r.isParent)
    .map(r => `
  // Validate ${r.controller} exists
  if (data.${r.controller}Id) {
    const existing${r.controller.charAt(0).toUpperCase() + r.controller.slice(1)} = await prisma.${r.controller}.findUnique({
      where: { id: data.${r.controller}Id }
    });
    if (!existing${r.controller.charAt(0).toUpperCase() + r.controller.slice(1)}) {
      throw new ApiError(404, '${r.controller.charAt(0).toUpperCase() + r.controller.slice(1)} not found');
    }
  }`).join('') || '';

  return `const ${name}Schema = z.object({
${zodSchema}
});

export const create${capitalizedName} = catchAsync(async (req: Request<{}, {}, ${capitalizedName}Type>, res: Response): Promise<void> => {
  const parsed = ${name}Schema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'Validation failed', parsed.error.errors);
  }
  
  const data = req.body;${relationValidation}
  
  const result = await ${serviceName}.create(data);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: '${capitalizedName} created successfully',
    data: result
  });
});`;
}

function generateCreateWithoutValidation(
  name: string,
  capitalizedName: string,
  serviceName: string
): string {
  return `export const create${capitalizedName} = catchAsync(async (req: Request<{}, {}, ${capitalizedName}Type>, res: Response): Promise<void> => {
  const data = req.body;
  const result = await ${serviceName}.create(data);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: '${capitalizedName} created successfully',
    data: result
  });
});`;
}

function mapZodType(prop: Properties): string {
  let zodType = '';
  
  switch (prop.type.toLowerCase()) {
    case 'string':
      zodType = 'z.string()';
      break;
    case 'number':
    case 'int':
      zodType = 'z.number().int()';
      break;
    case 'float':
      zodType = 'z.number()';
      break;
    case 'boolean':
      zodType = 'z.boolean()';
      break;
    case 'date':
    case 'datetime':
      zodType = 'z.date()';
      break;
    case 'json':
      zodType = 'z.object({}).passthrough()';
      break;
    default:
      zodType = 'z.string()';
  }

  // Apply validation rules
  if (prop.validation) {
    for (const validation of prop.validation) {
      switch (validation.type) {
        case 'minLength':
          zodType += `.min(${validation.value})`;
          break;
        case 'maxLength':
          zodType += `.max(${validation.value})`;
          break;
        case 'min':
          zodType += `.min(${validation.value})`;
          break;
        case 'max':
          zodType += `.max(${validation.value})`;
          break;
        case 'email':
          zodType += '.email()';
          break;
        case 'url':
          zodType += '.url()';
          break;
        case 'uuid':
          zodType += '.uuid()';
          break;
        case 'pattern':
          zodType += `.regex(/${validation.value}/)`;
          break;
      }
    }
  }

  if (prop.nullable) {
    zodType += '.optional()';
  }

  return zodType;
}