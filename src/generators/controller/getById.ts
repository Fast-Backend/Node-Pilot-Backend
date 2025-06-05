import { capitalize } from "../../utils/helpers";

export const getById = (name: string) => {
  const modelName = capitalize(name);
  const singularName = name;

  const code = `
export const get${modelName}ById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: 'Missing ID parameter' });
      return;
    }

    const item = await ${modelName}Service.getById(id);

    if (!item) {
      res.status(404).json({ message: '${modelName} not found' });
      return;
    }

    res.status(200).json(item);
  } catch (error) {
    console.error('Error fetching ${singularName} by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
`.trim();

  return code;
};