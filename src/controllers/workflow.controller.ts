import { Request, Response } from 'express';
import { generateWorkflow } from '../services/workflow.service';

export const handleWorkflowGenerate = async (req: Request, res: Response) => {
  try {
    const result = await generateWorkflow();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};