import { Properties } from "../../types/workflow";
import { capitalize, mapZodType } from "../../utils/helpers";


export const createNew = (name: string, properties?: Properties[]) => {
  const typeName = capitalize(name);
  const modelName = capitalize(name);

  const zodSchema =
    properties && properties.length
      ? `const ${name}Schema = z.object({\n` +
      properties
        .map((prop) => `  ${prop.name}: ${mapZodType(prop)}`)
        .join(',\n') +
      `\n});\n\n`
      : '';

  const validationBlock = properties && properties.length
    ? `
    const parsed = ${name}Schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: 'Validation failed', errors: parsed.error.errors });
        return;
    }
    const data = parsed.data;
  `
    : `const data = req.body;`;

  const code = `
${zodSchema}export const create${typeName} = async (req: Request<{}, {}, ${typeName}Type>, res: Response): Promise<void> => {
  try {
    ${validationBlock}

    const new${modelName} = await ${modelName}Service.create(data);
    res.status(201).json(new${modelName});
  } catch (error) {
    console.error('Error creating ${name}:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
`;

  return code;
};