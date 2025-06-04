import { Properties } from "../../types/workflow";
import { capitalize, mapZodType } from "../../utils/helpers";

export const update = (
    name: string,
    properties?: Properties[]
) => {
    const modelName = capitalize(name);

    const zodSchema =
        properties && properties.length
            ? `const update${modelName}Schema = z.object({\n` +
            properties
                .map((prop) => `  ${prop.name}: ${mapZodType(prop)}`)
                .join(',\n') +
            `\n}).partial();\n\n`
            : '';

    const validationBlock =
        properties && properties.length
            ? `
    const parsed = update${modelName}Schema.safeParse(req.body);
    if (!parsed.success) {
       res.status(400).json({ message: 'Validation failed', errors: parsed.error.errors });
       return;
    }
    const data = parsed.data;
    `
            : `const data = req.body;`;

    const code = `

${zodSchema}export const update${modelName} = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
       res.status(400).json({ message: 'Missing ID parameter' });
       return;
    }
    ${validationBlock}

    const existing = await prisma.${name}.findUnique({
      where: { id },
    });

    if (!existing) {
       res.status(404).json({ message: '${modelName} not found' });
       return;
    }

    const updated = await prisma.${name}.update({
      where: { id },
      data,
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating ${name}:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
`.trim();

    return code;
};