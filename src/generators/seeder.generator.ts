import fs from 'fs-extra';
import path from 'path';
import { capitalize, toCamelCase } from '../utils/helpers';
import { Properties, Workflow } from '../types/workflow';

interface SeederOptions {
  baseDir: string;
  workflows: Workflow[];
  recordCount: number;
  locale: string;
  customSeed: boolean;
}

export async function generateTestDataSeeder({ baseDir, workflows, recordCount, locale, customSeed }: SeederOptions): Promise<void> {
  // Generate package.json dependencies
  await addSeederDependencies(baseDir);
  
  // Generate main seeder file
  await generateMainSeeder(baseDir, workflows, recordCount, locale);
  
  // Generate individual entity seeders
  for (const workflow of workflows) {
    await generateEntitySeeder(baseDir, workflow, recordCount, locale);
  }
  
  // Generate custom seed template if requested
  if (customSeed) {
    await generateCustomSeedTemplate(baseDir);
  }
  
  // Generate seeding script
  await generateSeedScript(baseDir);
}

async function addSeederDependencies(baseDir: string): Promise<void> {
  const packageJsonPath = path.join(baseDir, 'package.json');
  
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);
    
    // Add faker.js dependency
    packageJson.devDependencies = packageJson.devDependencies || {};
    packageJson.devDependencies['@faker-js/faker'] = '^8.0.0';
    
    // Add seeding script
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts['seed'] = 'tsx prisma/seed.ts';
    packageJson.scripts['seed:reset'] = 'npx prisma db push --force-reset && npm run seed';
    
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  }
}

async function generateMainSeeder(baseDir: string, workflows: Workflow[], recordCount: number, locale: string): Promise<void> {
  const entityImports = workflows.map(w => 
    `import { seed${capitalize(w.name)} } from './seeders/${w.name}.seeder';`
  ).join('\n');
  
  const seedCalls = workflows.map(w => 
    `  await seed${capitalize(w.name)}(${recordCount});`
  ).join('\n');

  const content = `import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
${entityImports}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');
  
  // Configure faker locale (Note: locale setting for Faker v8+)
  
  try {
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing data...');
${workflows.map(w => `    await prisma.${toCamelCase(w.name)}.deleteMany({});`).join('\n')}
    
    console.log('📝 Seeding database with test data...');
    
${seedCalls}
    
    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
`;

  const targetPath = path.join(baseDir, 'prisma');
  await fs.ensureDir(targetPath);
  
  const seedersPath = path.join(targetPath, 'seeders');
  await fs.ensureDir(seedersPath);
  
  await fs.writeFile(path.join(targetPath, 'seed.ts'), content);
}

async function generateEntitySeeder(baseDir: string, workflow: Workflow, recordCount: number, locale: string): Promise<void> {
  const entityName = workflow.name;
  const capitalizedName = capitalize(entityName);
  const camelName = toCamelCase(entityName);
  
  // Generate faker data based on property types
  const generateFakeData = (props: Properties[]): string => {
    if (!props || props.length === 0) {
      return `
    // No properties defined for this entity
    data: {}`;
    }
    
    const dataFields = props.map(prop => {
      const fakerValue = getFakerValueForProperty(prop);
      return `      ${prop.name}: ${fakerValue}`;
    }).join(',\n');
    
    return `
    data: {
${dataFields}
    }`;
  };

  const content = `import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

export async function seed${capitalizedName}(count: number = ${recordCount}): Promise<void> {
  console.log(\`🔹 Seeding \${count} ${entityName} records...\`);
  
  const ${camelName}Data = Array.from({ length: count }, (_, index) => ({${generateFakeData(workflow.props || [])}
  }));
  
  // Insert data in batches for better performance
  const batchSize = 100;
  for (let i = 0; i < ${camelName}Data.length; i += batchSize) {
    const batch = ${camelName}Data.slice(i, i + batchSize);
    await prisma.${camelName}.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }
  
  console.log(\`✅ Created \${${camelName}Data.length} ${entityName} records\`);
}
`;

  const seedersPath = path.join(baseDir, 'prisma', 'seeders');
  await fs.ensureDir(seedersPath);
  
  await fs.writeFile(path.join(seedersPath, `${entityName}.seeder.ts`), content);
}

function getFakerValueForProperty(prop: Properties): string {
  const baseType = prop.type.toLowerCase();
  
  // Handle specific property names
  const propName = prop.name.toLowerCase();
  
  if (propName.includes('email')) {
    return 'faker.internet.email()';
  }
  if (propName.includes('name') && !propName.includes('username') && !propName.includes('filename')) {
    if (propName.includes('first')) return 'faker.person.firstName()';
    if (propName.includes('last')) return 'faker.person.lastName()';
    if (propName.includes('full')) return 'faker.person.fullName()';
    return 'faker.person.fullName()';
  }
  if (propName.includes('phone')) {
    return 'faker.phone.number()';
  }
  if (propName.includes('address')) {
    return 'faker.location.streetAddress()';
  }
  if (propName.includes('city')) {
    return 'faker.location.city()';
  }
  if (propName.includes('country')) {
    return 'faker.location.country()';
  }
  if (propName.includes('url') || propName.includes('website')) {
    return 'faker.internet.url()';
  }
  if (propName.includes('username')) {
    return 'faker.internet.userName()';
  }
  if (propName.includes('password')) {
    return 'faker.internet.password()';
  }
  if (propName.includes('avatar') || propName.includes('image')) {
    return 'faker.image.avatar()';
  }
  if (propName.includes('bio') || propName.includes('description')) {
    return 'faker.lorem.paragraph()';
  }
  if (propName.includes('title')) {
    return 'faker.lorem.sentence()';
  }
  if (propName.includes('price') || propName.includes('amount') || propName.includes('cost')) {
    return 'faker.commerce.price()';
  }
  if (propName.includes('company')) {
    return 'faker.company.name()';
  }
  
  // Handle by data type
  switch (baseType) {
    case 'string':
      if (prop.validation?.some(v => v.type === 'email')) {
        return 'faker.internet.email()';
      }
      if (prop.validation?.some(v => v.type === 'url')) {
        return 'faker.internet.url()';
      }
      if (prop.validation?.some(v => v.type === 'uuid')) {
        return 'faker.string.uuid()';
      }
      
      // Check length constraints
      const minLength = prop.validation?.find(v => v.type === 'minLength')?.value as number;
      const maxLength = prop.validation?.find(v => v.type === 'maxLength')?.value as number;
      
      if (minLength || maxLength) {
        const min = minLength || 5;
        const max = maxLength || 50;
        return `faker.lorem.words({ min: ${Math.ceil(min/6)}, max: ${Math.ceil(max/6)} }).substring(0, ${max})`;
      }
      
      return 'faker.lorem.words(3)';
      
    case 'number':
    case 'int':
    case 'integer':
      const minVal = prop.validation?.find(v => v.type === 'min')?.value as number || 1;
      const maxVal = prop.validation?.find(v => v.type === 'max')?.value as number || 1000;
      return `faker.number.int({ min: ${minVal}, max: ${maxVal} })`;
      
    case 'float':
    case 'decimal':
      const floatMin = prop.validation?.find(v => v.type === 'min')?.value as number || 0;
      const floatMax = prop.validation?.find(v => v.type === 'max')?.value as number || 100;
      return `faker.number.float({ min: ${floatMin}, max: ${floatMax}, fractionDigits: 2 })`;
      
    case 'boolean':
      return 'faker.datatype.boolean()';
      
    case 'date':
    case 'datetime':
      return 'faker.date.recent()';
      
    case 'json':
      return `{
        key1: faker.lorem.word(),
        key2: faker.number.int({ min: 1, max: 100 }),
        key3: faker.datatype.boolean()
      }`;
      
    case 'array':
      return 'faker.lorem.words(3).split(" ")';
      
    default:
      return 'faker.lorem.word()';
  }
}

async function generateCustomSeedTemplate(baseDir: string): Promise<void> {
  const content = `import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

/**
 * Custom seeding script
 * 
 * This file allows you to create custom seeding logic that goes beyond
 * the automatically generated seeders. You can:
 * 
 * 1. Create specific test scenarios
 * 2. Set up relationships between entities
 * 3. Create admin users or special data
 * 4. Generate realistic data flows
 */

export async function customSeed(): Promise<void> {
  console.log('🎯 Running custom seeding...');
  
  try {
    // Example: Create an admin user
    // const adminUser = await prisma.user.create({
    //   data: {
    //     email: 'admin@example.com',
    //     name: 'Admin User',
    //     role: 'ADMIN',
    //     // Add other required fields
    //   }
    // });
    
    // Example: Create related data
    // const category = await prisma.category.create({
    //   data: {
    //     name: 'Technology',
    //     description: 'Technology related posts'
    //   }
    // });
    
    // const posts = await prisma.post.createMany({
    //   data: Array.from({ length: 5 }, () => ({
    //     title: faker.lorem.sentence(),
    //     content: faker.lorem.paragraphs(3),
    //     authorId: adminUser.id,
    //     categoryId: category.id,
    //     published: true
    //   }))
    // });
    
    console.log('✅ Custom seeding completed');
  } catch (error) {
    console.error('❌ Error in custom seeding:', error);
    throw error;
  }
}
`;

  const customSeedPath = path.join(baseDir, 'prisma', 'seeders', 'custom.seeder.ts');
  await fs.writeFile(customSeedPath, content);
}

async function generateSeedScript(baseDir: string): Promise<void> {
  const content = `#!/usr/bin/env node
/**
 * Database Seeding Script
 * 
 * This script provides various seeding options:
 * 
 * npm run seed              - Run normal seeding
 * npm run seed:reset        - Reset database and seed
 * node seed-script.js --env - Seed with environment-specific data
 * node seed-script.js --custom - Run only custom seeding
 */

const { execSync } = require('child_process');
const args = process.argv.slice(2);

try {
  if (args.includes('--help')) {
    console.log(\`
Database Seeding Options:

  npm run seed              Normal seeding with fake data
  npm run seed:reset        Reset database and seed
  node seed-script.js --env Seed with environment data
  node seed-script.js --custom Run custom seeding only

Environment Variables:
  SEED_COUNT=50            Number of records per entity
  SEED_LOCALE=en           Faker locale for generated data
    \`);
    process.exit(0);
  }
  
  if (args.includes('--custom')) {
    console.log('🎯 Running custom seeding only...');
    execSync('tsx prisma/seeders/custom.seeder.ts', { stdio: 'inherit' });
  } else if (args.includes('--env')) {
    console.log('🌍 Running environment-specific seeding...');
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
    execSync('tsx prisma/seed.ts', { stdio: 'inherit' });
  } else {
    console.log('🌱 Running standard seeding...');
    execSync('tsx prisma/seed.ts', { stdio: 'inherit' });
  }
  
  console.log('✅ Seeding completed successfully!');
} catch (error) {
  console.error('❌ Seeding failed:', error.message);
  process.exit(1);
}
`;

  await fs.writeFile(path.join(baseDir, 'seed-script.js'), content);
  
  // Make script executable
  await fs.chmod(path.join(baseDir, 'seed-script.js'), 0o755);
}