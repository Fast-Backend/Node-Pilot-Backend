import fs from 'fs-extra';
import path from 'path';
import { capitalize, toCamelCase } from '../utils/helpers';
import { Properties, Workflow } from '../types/workflow';

interface SwaggerOptions {
  baseDir: string;
  workflows: Workflow[];
  title: string;
  description: string;
  version: string;
  includeSwaggerUI: boolean;
  projectName: string;
}

export async function generateSwaggerDocs({ baseDir, workflows, title, description, version, includeSwaggerUI, projectName }: SwaggerOptions): Promise<void> {
  // Add swagger dependencies to package.json
  await addSwaggerDependencies(baseDir, includeSwaggerUI);
  
  // Generate OpenAPI specification
  await generateOpenAPISpec(baseDir, workflows, title, description, version);
  
  // Generate swagger setup file
  await generateSwaggerSetup(baseDir, includeSwaggerUI);
  
  // Update app.ts to include swagger
  await updateAppWithSwagger(baseDir, includeSwaggerUI);
  
  // Generate API documentation README
  await generateApiDocsReadme(baseDir, title, description, projectName);
}

async function addSwaggerDependencies(baseDir: string, includeSwaggerUI: boolean): Promise<void> {
  const packageJsonPath = path.join(baseDir, 'package.json');
  
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);
    
    packageJson.dependencies = packageJson.dependencies || {};
    packageJson.devDependencies = packageJson.devDependencies || {};
    
    // Core swagger dependencies
    packageJson.dependencies['swagger-jsdoc'] = '^6.2.8';
    packageJson.devDependencies['@types/swagger-jsdoc'] = '^3.0.1';
    
    if (includeSwaggerUI) {
      packageJson.dependencies['swagger-ui-express'] = '^5.0.0';
      packageJson.devDependencies['@types/swagger-ui-express'] = '^4.1.4';
    }
    
    // Add documentation generation script
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts['docs:generate'] = 'node scripts/generate-docs.js';
    packageJson.scripts['docs:validate'] = 'swagger-codegen validate -i docs/openapi.yaml';
    
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  }
}

async function generateOpenAPISpec(baseDir: string, workflows: Workflow[], title: string, description: string, version: string): Promise<void> {
  const paths: Record<string, any> = {};
  const components: Record<string, any> = {
    schemas: {},
    responses: {
      Error: {
        description: 'Error response',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                statusCode: { type: 'integer' },
                success: { type: 'boolean', example: false },
                message: { type: 'string' },
                errors: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      },
      Success: {
        description: 'Success response',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                statusCode: { type: 'integer' },
                success: { type: 'boolean', example: true },
                message: { type: 'string' },
                data: { type: 'object' }
              }
            }
          }
        }
      }
    }
  };

  // Generate schemas and paths for each workflow
  workflows.forEach(workflow => {
    const entityName = workflow.name;
    const capitalizedName = capitalize(entityName);
    const camelName = toCamelCase(entityName);
    
    // Generate schema
    components.schemas[capitalizedName] = generateEntitySchema(workflow);
    components.schemas[`${capitalizedName}Input`] = generateEntityInputSchema(workflow);
    components.schemas[`${capitalizedName}List`] = {
      type: 'object',
      properties: {
        statusCode: { type: 'integer', example: 200 },
        success: { type: 'boolean', example: true },
        message: { type: 'string' },
        data: {
          type: 'array',
          items: { $ref: `#/components/schemas/${capitalizedName}` }
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            skip: { type: 'integer' },
            take: { type: 'integer' },
            page: { type: 'integer' },
            totalPages: { type: 'integer' }
          }
        }
      }
    };
    
    // Generate paths
    const basePath = `/api/${camelName}`;
    
    paths[basePath] = {
      get: {
        tags: [capitalizedName],
        summary: `Get all ${entityName} records`,
        description: `Retrieve a paginated list of ${entityName} records with optional filtering and sorting`,
        parameters: [
          {
            name: 'skip',
            in: 'query',
            description: 'Number of records to skip for pagination',
            required: false,
            schema: { type: 'integer', minimum: 0, default: 0 }
          },
          {
            name: 'take',
            in: 'query',
            description: 'Number of records to take (max 100)',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
          },
          {
            name: 'sortBy',
            in: 'query',
            description: 'Field to sort by',
            required: false,
            schema: { type: 'string', default: 'createdAt' }
          },
          {
            name: 'order',
            in: 'query',
            description: 'Sort order',
            required: false,
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
          },
          {
            name: 'search',
            in: 'query',
            description: 'Search term for filtering results',
            required: false,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${capitalizedName}List` }
              }
            }
          },
          '400': { $ref: '#/components/responses/Error' },
          '500': { $ref: '#/components/responses/Error' }
        }
      },
      post: {
        tags: [capitalizedName],
        summary: `Create a new ${entityName}`,
        description: `Create a new ${entityName} record`,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${capitalizedName}Input` }
            }
          }
        },
        responses: {
          '201': {
            description: 'Created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    statusCode: { type: 'integer', example: 201 },
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    data: { $ref: `#/components/schemas/${capitalizedName}` }
                  }
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/Error' },
          '409': { $ref: '#/components/responses/Error' },
          '500': { $ref: '#/components/responses/Error' }
        }
      }
    };
    
    paths[`${basePath}/{id}`] = {
      get: {
        tags: [capitalizedName],
        summary: `Get ${entityName} by ID`,
        description: `Retrieve a specific ${entityName} record by its ID`,
        parameters: [
          {
            name: 'id',
            in: 'path',
            description: `${capitalizedName} ID`,
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    statusCode: { type: 'integer', example: 200 },
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    data: { $ref: `#/components/schemas/${capitalizedName}` }
                  }
                }
              }
            }
          },
          '404': { $ref: '#/components/responses/Error' },
          '500': { $ref: '#/components/responses/Error' }
        }
      },
      put: {
        tags: [capitalizedName],
        summary: `Update ${entityName}`,
        description: `Update an existing ${entityName} record`,
        parameters: [
          {
            name: 'id',
            in: 'path',
            description: `${capitalizedName} ID`,
            required: true,
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${capitalizedName}Input` }
            }
          }
        },
        responses: {
          '200': {
            description: 'Updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    statusCode: { type: 'integer', example: 200 },
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    data: { $ref: `#/components/schemas/${capitalizedName}` }
                  }
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/Error' },
          '404': { $ref: '#/components/responses/Error' },
          '500': { $ref: '#/components/responses/Error' }
        }
      },
      delete: {
        tags: [capitalizedName],
        summary: `Delete ${entityName}`,
        description: `Delete a ${entityName} record`,
        parameters: [
          {
            name: 'id',
            in: 'path',
            description: `${capitalizedName} ID`,
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    statusCode: { type: 'integer', example: 200 },
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' }
                  }
                }
              }
            }
          },
          '404': { $ref: '#/components/responses/Error' },
          '500': { $ref: '#/components/responses/Error' }
        }
      }
    };
  });

  const openApiSpec = {
    openapi: '3.0.3',
    info: {
      title: title || 'Generated API Documentation',
      description: description || 'Auto-generated API documentation for your backend services',
      version: version || '1.0.0',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.example.com',
        description: 'Production server'
      }
    ],
    paths,
    components,
    tags: workflows.map(workflow => ({
      name: capitalize(workflow.name),
      description: `Operations related to ${workflow.name}`
    }))
  };

  const docsPath = path.join(baseDir, 'docs');
  await fs.ensureDir(docsPath);
  
  // Write OpenAPI spec as JSON
  await fs.writeJson(path.join(docsPath, 'openapi.json'), openApiSpec, { spaces: 2 });
  
  // Write OpenAPI spec as YAML (simple conversion)
  const yamlStr = convertToYaml(openApiSpec);
  await fs.writeFile(path.join(docsPath, 'openapi.yaml'), yamlStr);
}

function generateEntitySchema(workflow: Workflow): any {
  const properties: any = {
    id: {
      type: 'string',
      description: 'Unique identifier',
      example: 'uuid-string'
    }
  };

  // Add properties from workflow
  if (workflow.props) {
    workflow.props.forEach(prop => {
      properties[prop.name] = generatePropertySchema(prop);
    });
  }

  // Add timestamp fields
  properties.createdAt = {
    type: 'string',
    format: 'date-time',
    description: 'Creation timestamp'
  };
  properties.updatedAt = {
    type: 'string',
    format: 'date-time',
    description: 'Last update timestamp'
  };

  return {
    type: 'object',
    properties,
    required: ['id', 'createdAt', 'updatedAt', ...(workflow.props?.filter(p => !p.nullable).map(p => p.name) || [])]
  };
}

function generateEntityInputSchema(workflow: Workflow): any {
  if (!workflow.props || workflow.props.length === 0) {
    return {
      type: 'object',
      properties: {},
      additionalProperties: false
    };
  }

  const properties: any = {};
  
  workflow.props.forEach(prop => {
    properties[prop.name] = generatePropertySchema(prop);
  });

  return {
    type: 'object',
    properties,
    required: workflow.props.filter(p => !p.nullable).map(p => p.name),
    additionalProperties: false
  };
}

function generatePropertySchema(prop: Properties): any {
  const schema: any = {};
  
  switch (prop.type.toLowerCase()) {
    case 'string':
      schema.type = 'string';
      if (prop.validation) {
        prop.validation.forEach(validation => {
          switch (validation.type) {
            case 'minLength':
              schema.minLength = validation.value;
              break;
            case 'maxLength':
              schema.maxLength = validation.value;
              break;
            case 'pattern':
              schema.pattern = validation.value;
              break;
            case 'email':
              schema.format = 'email';
              break;
            case 'url':
              schema.format = 'uri';
              break;
            case 'uuid':
              schema.format = 'uuid';
              break;
            case 'enum':
              schema.enum = (validation as any).values;
              break;
          }
        });
      }
      break;
      
    case 'number':
    case 'int':
    case 'integer':
      schema.type = 'integer';
      if (prop.validation) {
        prop.validation.forEach(validation => {
          switch (validation.type) {
            case 'min':
              schema.minimum = validation.value;
              break;
            case 'max':
              schema.maximum = validation.value;
              break;
          }
        });
      }
      break;
      
    case 'float':
    case 'decimal':
      schema.type = 'number';
      schema.format = 'float';
      if (prop.validation) {
        prop.validation.forEach(validation => {
          switch (validation.type) {
            case 'min':
              schema.minimum = validation.value;
              break;
            case 'max':
              schema.maximum = validation.value;
              break;
          }
        });
      }
      break;
      
    case 'boolean':
      schema.type = 'boolean';
      break;
      
    case 'date':
    case 'datetime':
      schema.type = 'string';
      schema.format = 'date-time';
      break;
      
    case 'json':
      schema.type = 'object';
      schema.additionalProperties = true;
      break;
      
    case 'array':
      schema.type = 'array';
      schema.items = { type: 'string' };
      break;
      
    default:
      schema.type = 'string';
  }
  
  if (prop.nullable) {
    schema.nullable = true;
  }
  
  return schema;
}

async function generateSwaggerSetup(baseDir: string, includeSwaggerUI: boolean): Promise<void> {
  const content = `import path from 'path';
import fs from 'fs';
import swaggerJSDoc from 'swagger-jsdoc';
${includeSwaggerUI ? "import swaggerUi from 'swagger-ui-express';" : ''}
import { Express } from 'express';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
      description: 'Auto-generated API documentation',
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
        description: 'API Server',
      },
    ],
  },
  apis: [
    path.join(__dirname, '../routes/*.ts'),
    path.join(__dirname, '../controllers/*.ts'),
  ],
};

const specs = swaggerJSDoc(options);

// Load the generated OpenAPI spec if it exists
const openApiPath = path.join(__dirname, '../docs/openapi.json');
let openApiSpec = specs;

if (fs.existsSync(openApiPath)) {
  try {
    const fileContent = fs.readFileSync(openApiPath, 'utf8');
    openApiSpec = JSON.parse(fileContent);
  } catch (error) {
    console.warn('Failed to load OpenAPI spec file, using JSDoc generated spec');
  }
}

export function setupSwagger(app: Express): void {
  ${includeSwaggerUI ? `
  // Swagger UI setup
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', swaggerUi.setup(openApiSpec, {
    customCss: \`.swagger-ui .topbar { display: none }\`,
    customSiteTitle: "API Documentation",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    }
  }));
  
  console.log('📚 Swagger UI available at: /api-docs');
  ` : ''}
  
  // JSON endpoint for OpenAPI spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(openApiSpec);
  });
  
  console.log('📄 OpenAPI spec available at: /api-docs.json');
}

export { openApiSpec };
`;

  await fs.writeFile(path.join(baseDir, 'src', 'swagger.ts'), content);
}

async function updateAppWithSwagger(baseDir: string, includeSwaggerUI: boolean): Promise<void> {
  const appPath = path.join(baseDir, 'src', 'app.ts');
  
  if (await fs.pathExists(appPath)) {
    let appContent = await fs.readFile(appPath, 'utf8');
    
    // Add swagger import
    const swaggerImport = "import { setupSwagger } from './swagger';";
    
    if (!appContent.includes(swaggerImport)) {
      // Find the last import statement and add swagger import after it
      const importRegex = /^import.*?;$/gm;
      const imports = appContent.match(importRegex) || [];
      
      if (imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        appContent = appContent.replace(lastImport, lastImport + '\n' + swaggerImport);
      } else {
        // If no imports found, add at the beginning
        appContent = swaggerImport + '\n\n' + appContent;
      }
    }
    
    // Add swagger setup call
    const swaggerSetup = '\n// Setup API documentation\nsetupSwagger(app);';
    
    if (!appContent.includes('setupSwagger(app)')) {
      // Find where to insert swagger setup (before export default app)
      const exportMatch = appContent.match(/export default app;/);
      if (exportMatch) {
        appContent = appContent.replace('export default app;', swaggerSetup + '\n\nexport default app;');
      } else {
        // If no export found, add at the end
        appContent += swaggerSetup;
      }
    }
    
    await fs.writeFile(appPath, appContent);
  }
}

async function generateApiDocsReadme(baseDir: string, title: string, description: string, projectName: string): Promise<void> {
  const content = `# ${title || `${projectName} API Documentation`}

${description || 'Auto-generated API documentation for your backend services.'}

## 📚 Available Documentation

### Interactive Documentation
- **Swagger UI**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
  - Interactive API explorer with request/response examples
  - Try out API endpoints directly from the browser
  - Authentication testing support

### API Specifications
- **OpenAPI JSON**: [http://localhost:3000/api-docs.json](http://localhost:3000/api-docs.json)
- **OpenAPI YAML**: \`docs/openapi.yaml\`

## 🚀 Getting Started

### Viewing Documentation

1. Start your development server:
   \`\`\`bash
   npm run dev
   \`\`\`

2. Open your browser and navigate to:
   - Interactive docs: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
   - Raw spec: [http://localhost:3000/api-docs.json](http://localhost:3000/api-docs.json)

### Using the API

All API endpoints follow RESTful conventions:

- \`GET /api/{resource}\` - List all resources (with pagination)
- \`GET /api/{resource}/{id}\` - Get a specific resource
- \`POST /api/{resource}\` - Create a new resource
- \`PUT /api/{resource}/{id}\` - Update a resource
- \`DELETE /api/{resource}/{id}\` - Delete a resource

### Request/Response Format

All API responses follow this structure:

\`\`\`json
{
  "statusCode": 200,
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* Resource data */ },
  "meta": { /* Pagination info for list endpoints */ }
}
\`\`\`

Error responses:

\`\`\`json
{
  "statusCode": 400,
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"]
}
\`\`\`

### Pagination

List endpoints support pagination with these query parameters:

- \`skip\` - Number of records to skip (default: 0)
- \`take\` - Number of records to return (default: 10, max: 100)
- \`sortBy\` - Field to sort by (default: createdAt)
- \`order\` - Sort order: asc or desc (default: desc)
- \`search\` - Search term for filtering results

Example:
\`\`\`
GET /api/users?skip=20&take=10&sortBy=name&order=asc&search=john
\`\`\`

### Authentication

If your API includes authentication, add your API key or token to requests:

\`\`\`bash
curl -H "Authorization: Bearer YOUR_TOKEN" \\
     http://localhost:3000/api/users
\`\`\`

## 📖 Documentation Management

### Updating Documentation

The API documentation is automatically generated based on your:
- Entity schemas and properties
- Validation rules
- Route definitions

To regenerate documentation after schema changes:

\`\`\`bash
npm run docs:generate
\`\`\`

### Customizing Documentation

1. **Edit OpenAPI spec directly**: Modify \`docs/openapi.yaml\`
2. **Update swagger setup**: Edit \`src/swagger.ts\`
3. **Add JSDoc comments**: Add documentation comments to your route handlers

### Validation

Validate your OpenAPI specification:

\`\`\`bash
npm run docs:validate
\`\`\`

## 🔧 Development Tools

### Generating Client SDKs

Use the OpenAPI spec to generate client libraries:

\`\`\`bash
# TypeScript/JavaScript client
npx @openapitools/openapi-generator-cli generate \\
  -i docs/openapi.yaml \\
  -g typescript-axios \\
  -o clients/typescript

# Python client
npx @openapitools/openapi-generator-cli generate \\
  -i docs/openapi.yaml \\
  -g python \\
  -o clients/python
\`\`\`

### API Testing

Use the OpenAPI spec for automated testing:

\`\`\`bash
# Install testing tools
npm install --save-dev @apidevtools/swagger-parser supertest

# Run API tests
npm test
\`\`\`

## 📝 Notes

- Documentation is automatically updated when you modify your entity schemas
- The Swagger UI is only available in development by default
- For production, consider hosting static documentation or using API gateways
- Always validate your API specification before deploying

## 🤝 Contributing

When adding new endpoints:

1. Follow existing naming conventions
2. Include proper validation rules
3. Add meaningful descriptions
4. Test endpoints using Swagger UI
5. Update this README if needed

---

Generated by Node-Flow - Visual Backend Code Generator
`;

  const docsPath = path.join(baseDir, 'docs');
  await fs.ensureDir(docsPath);
  
  await fs.writeFile(path.join(docsPath, 'README.md'), content);
}

function convertToYaml(obj: any, indent = 0): string {
  const spaces = '  '.repeat(indent);
  let yaml = '';
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      yaml += `${spaces}- ${convertToYaml(item, indent + 1).trim()}\n`;
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        yaml += `${spaces}${key}:\n${convertToYaml(value, indent + 1)}`;
      } else {
        const valueStr = typeof value === 'string' ? `"${value.replace(/"/g, '\\"')}"` : String(value);
        yaml += `${spaces}${key}: ${valueStr}\n`;
      }
    }
  } else {
    return String(obj);
  }
  
  return yaml;
}