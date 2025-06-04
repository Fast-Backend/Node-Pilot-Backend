import { capitalize } from "../../utils/helpers";

export const deleteById = (name: string) => {
    const modelName = capitalize(name);

    const code = `
export const delete${modelName} = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
       res.status(400).json({ message: 'Missing ID parameter' });
       return;
    }

    const existing = await prisma.${name}.findUnique({
      where: { id },
    });

    if (!existing) {
       res.status(404).json({ message: '${modelName} not found' });
       return;
    }

    await prisma.${name}.delete({
      where: { id },
    });

    res.status(204).send(); // No Content
  } catch (error) {
    console.error('Error deleting ${name} by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
`.trim();

    return code;
};