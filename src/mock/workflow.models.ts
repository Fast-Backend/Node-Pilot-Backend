import { Workflow, Workflows } from "../types/workflow";

export const workflows: Workflows =
{
    id: "1",
    name: "Test",
    workflows: [

        {
            id: 'wf123',
            // steps: [
            //     {
            //         type: 'controller', name: 'user',
            //     },
            //     { type: 'route', name: 'user', path: '/users', method: 'GET' }
            // ],
            controllers: {
                name: "user", routes: null
            },
            props: [{
                name: "name", type: "string", nullable: true
            }, {
                name: "age", type: "number", nullable: false
            }],
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ]
}
    ;