export const getAll = (name: string, controllerName: string, pluralName: string) => {
    const code =
        `
export const getAll${controllerName} = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      skip = '0',
      take = '10',
      sortBy = 'createdAt',
      order = 'desc',
      search,
      ...filters
    } = req.query;

    // Convert skip/take to numbers safely
    const skipNum = Math.max(parseInt(skip as string) || 0, 0);
    const takeNum = Math.min(parseInt(take as string) || 10, 100); // cap to avoid abuse

    // Basic validation for order
    const orderValue = (order === 'asc' || order === 'desc') ? order : 'desc';

    // Build where clause
    const where: any = {};

    // Add search support on a string field (e.g., 'name')
    if (search) {
      where.name = {
        contains: search as string,
        mode: 'insensitive',
      };
    }

    // Add other filters dynamically from query string
    Object.keys(filters).forEach((key) => {
      if (typeof filters[key] === 'string') {
        where[key] = filters[key];
      }
    });

    // Fetch data
    const [data, total] = await Promise.all([
      prisma.${name}.findMany({
        where,
        skip: skipNum,
        take: takeNum,
        orderBy: {
          [sortBy as string]: orderValue,
        },
      }),
      prisma.${name}.count({ where }),
    ]);

    res.status(200).json({
      data,
      meta: {
        total,
        skip: skipNum,
        take: takeNum,
      },
    });

  } catch (error) {
    console.error('Error fetching ${pluralName}:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
`.trim();

    return code
}

