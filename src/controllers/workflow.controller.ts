import { Request, Response } from 'express';
import { generateWorkflow } from '../services/workflow.service';
import { Workflows } from '../types/workflow';
import archiver from 'archiver';
import fs from 'fs-extra';
import path from 'path';

export const handleWorkflowGenerate = async (req: Request<{}, {}, Workflows>, res: Response) => {
  const data = req.body;
  try {
    const result = await generateWorkflow(data);
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Set headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=workflow.zip');

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(res);
    archive.directory(result.baseDir, false);
    archive.finalize()
    res.on('finish', () => {
      deleteGeneratedFolder(result.baseDir);
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

const deleteGeneratedFolder = async (folderPath: string) => {
  const parentFolder = path.dirname(folderPath);

  try {
    await fs.rm(parentFolder, { recursive: true, force: true });
  } catch (err) {
    console.error(`Failed to delete folder: ${parentFolder}`, err);
  }
};