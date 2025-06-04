import { Router } from 'express';
import { handleWorkflowGenerate } from '../controllers/workflow.controller';

const workflowRouter = Router();

workflowRouter.post('/workflows/generate', handleWorkflowGenerate);

export default workflowRouter;