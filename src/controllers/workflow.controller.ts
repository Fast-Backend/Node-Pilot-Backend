import { Request, Response } from 'express';
import { generateWorkflow } from '../services/workflow.service';
import { Workflows } from '../types/workflow';
import { catchAsync } from '../utils/catchAsync';
import { ApiError } from '../utils/ApiError';
import { sendResponse } from '../utils/response';
import archiver from 'archiver';
import fs from 'fs-extra';
import path from 'path';

export const handleWorkflowGenerate = catchAsync(async (req: Request<{}, {}, Workflows>, res: Response): Promise<void> => {
  const data = req.body;
  
  if (!data.workflows || data.workflows.length === 0) {
    throw new ApiError(400, 'At least one workflow is required');
  }

  if (data.workflows.length > 20) {
    throw new ApiError(400, 'Maximum 20 entities allowed per project');
  }

  const result = await generateWorkflow(data);
  
  if (!result.baseDir || !fs.existsSync(result.baseDir)) {
    throw new ApiError(500, 'Failed to generate project files');
  }

  const archive = archiver('zip', { 
    zlib: { level: 9 },
    store: false 
  });

  // Set headers for ZIP download
  const sanitizedProjectName = data.name.replace(/[^a-zA-Z0-9-_]/g, '_');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${sanitizedProjectName}.zip"`);
  res.setHeader('Cache-Control', 'no-cache');

  // Handle archive errors
  archive.on('error', (err) => {
    console.error('Archive error:', err);
    throw new ApiError(500, 'Failed to create project archive');
  });

  // Track archive progress
  archive.on('progress', (progress) => {
    console.log(`Archive progress: ${progress.entries.processed}/${progress.entries.total} files`);
  });

  // Pipe archive to response
  archive.pipe(res);
  
  try {
    // Add directory to archive
    archive.directory(result.baseDir, false);
    await archive.finalize();
    
    // Schedule cleanup after response is sent
    res.on('finish', () => {
      deleteGeneratedFolder(result.baseDir);
    });
    
    res.on('error', (err) => {
      console.error('Response error:', err);
      deleteGeneratedFolder(result.baseDir);
    });
    
  } catch (error) {
    // Cleanup on error
    deleteGeneratedFolder(result.baseDir);
    throw new ApiError(500, 'Failed to package project files');
  }
});

export const getWorkflowStatus = catchAsync(async (req: Request, res: Response): Promise<void> => {
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Workflow service is running',
    data: {
      version: '1.0.0',
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  });
});

const deleteGeneratedFolder = async (folderPath: string): Promise<void> => {
  const parentFolder = path.dirname(folderPath);

  try {
    if (fs.existsSync(parentFolder)) {
      await fs.rm(parentFolder, { recursive: true, force: true });
      console.log(`Cleaned up generated folder: ${parentFolder}`);
    }
  } catch (err) {
    console.error(`Failed to delete folder: ${parentFolder}`, err);
  }
};