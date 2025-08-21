export interface ServiceTemplate {
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

export const generateServiceTemplate = (modelName: string): ServiceTemplate => {
  const camelModel = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const capitalizedName = modelName.charAt(0).toUpperCase() + modelName.slice(1);

  const imports = `import { ${capitalizedName}Type } from '../types/${modelName}';
import prisma from '../lib/prisma';
import { ApiError } from '../utils/ApiError';`;

  const methods = {
    getAll: `async getAll(query: any) {
    const {
      skip = '0',
      take = '10',
      sortBy = 'createdAt',
      order = 'desc',
      search,
      ...filters
    } = query;

    const skipNum = Math.max(parseInt(skip) || 0, 0);
    const takeNum = Math.min(parseInt(take) || 10, 100);
    const orderValue = (order === 'asc' || order === 'desc') ? order : 'desc';

    const where: any = {};

    // Generic search functionality
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } }
      ].filter(condition => 
        // Only include fields that exist in the model
        Object.keys(condition)[0] !== 'name' || hasNameField()
      );
    }

    // Apply filters
    Object.keys(filters).forEach((key) => {
      if (typeof filters[key] === 'string' && filters[key].trim() !== '') {
        where[key] = filters[key];
      }
    });

    try {
      const [data, total] = await Promise.all([
        prisma.${camelModel}.findMany({
          where,
          skip: skipNum,
          take: takeNum,
          orderBy: {
            [sortBy]: orderValue,
          },
        }),
        prisma.${camelModel}.count({ where }),
      ]);

      return {
        data,
        meta: {
          total,
          skip: skipNum,
          take: takeNum,
          page: Math.floor(skipNum / takeNum) + 1,
          totalPages: Math.ceil(total / takeNum)
        }
      };
    } catch (error) {
      throw new ApiError(500, 'Failed to retrieve ${modelName.toLowerCase()} records');
    }
  }`,

    getById: `async getById(id: string) {
    try {
      const result = await prisma.${camelModel}.findUnique({
        where: { id },
      });
      return result;
    } catch (error) {
      throw new ApiError(500, 'Failed to retrieve ${modelName.toLowerCase()}');
    }
  }`,

    create: `async create(data: any) {
    try {
      const result = await prisma.${camelModel}.create({ 
        data,
        include: getIncludeRelations()
      });
      return result;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ApiError(409, 'A record with this information already exists');
      }
      if (error.code === 'P2003') {
        throw new ApiError(400, 'Referenced record does not exist');
      }
      throw new ApiError(500, 'Failed to create ${modelName.toLowerCase()}');
    }
  }`,

    update: `async update(id: string, data: Partial<${capitalizedName}Type>) {
    try {
      const existing = await prisma.${camelModel}.findUnique({ where: { id } });
      if (!existing) return null;

      const result = await prisma.${camelModel}.update({
        where: { id },
        data,
        include: getIncludeRelations()
      });
      return result;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ApiError(409, 'A record with this information already exists');
      }
      if (error.code === 'P2003') {
        throw new ApiError(400, 'Referenced record does not exist');
      }
      if (error.code === 'P2025') {
        return null;
      }
      throw new ApiError(500, 'Failed to update ${modelName.toLowerCase()}');
    }
  }`,

    delete: `async delete(id: string) {
    try {
      const existing = await prisma.${camelModel}.findUnique({ where: { id } });
      if (!existing) return false;

      await prisma.${camelModel}.delete({ where: { id } });
      return true;
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new ApiError(400, 'Cannot delete record with existing references');
      }
      if (error.code === 'P2025') {
        return false;
      }
      throw new ApiError(500, 'Failed to delete ${modelName.toLowerCase()}');
    }
  }`
  };

  const helperMethods = `
// Helper functions for ${capitalizedName}Service
const hasNameField = (): boolean => {
  // This should be dynamically determined based on the model schema
  // For now, we'll assume most models have a name field
  return true;
};

const getIncludeRelations = (): any => {
  // This should be dynamically determined based on the model relations
  // For now, return empty object - can be extended per model
  return {};
};`;

  const serviceClass = `${helperMethods}

export const ${capitalizedName}Service = {
  ${methods.getAll},

  ${methods.getById},

  ${methods.create},

  ${methods.update},

  ${methods.delete}
};`;

  return {
    imports,
    class: serviceClass,
    methods
  };
};