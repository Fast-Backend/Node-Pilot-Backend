import { Router } from 'express';
import { handleWorkflowGenerate } from '../controllers/workflow.controller';

const workflowRouter = Router();

workflowRouter.post('/generate', handleWorkflowGenerate);

export default workflowRouter;