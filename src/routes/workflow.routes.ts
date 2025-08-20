import { Router } from 'express';
import { handleWorkflowGenerate, getWorkflowStatus } from '../controllers/workflow.controller';
import { validateWorkflowRequest } from '../middleware/validation';

const workflowRouter = Router();

// Health check endpoint
workflowRouter.get('/status', getWorkflowStatus);

// Generate workflow endpoint with validation
workflowRouter.post('/generate', validateWorkflowRequest, handleWorkflowGenerate);

export default workflowRouter;