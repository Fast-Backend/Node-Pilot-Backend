import { capitalize } from "../../utils/helpers";

export const getAll = (name: string, controllerName: string, pluralName: string) => {
  const code =
    `
export const getAll${controllerName} = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await ${capitalize(name)}Service.getAll(req.query);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching ${pluralName}:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
`.trim();

  return code
}

