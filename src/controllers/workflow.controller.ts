import { Request, Response } from 'express';
import { generateWorkflow } from '../services/workflow.service';
import { Workflows } from '../types/workflow';

export const handleWorkflowGenerate = async (req: Request<{}, {}, Workflows>, res: Response) => {
  const data = req.body
  try {
    const result = await generateWorkflow(data);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};