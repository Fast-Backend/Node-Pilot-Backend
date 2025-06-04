import { Workflow, Workflows } from "../types/workflow";

export const workflows: Workflows =
{
    id: "1",
    name: "Test",
    workflows: [

        {
            id: 'wf123',
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
        },
        {
            id: '123',
            controllers: {
                name: "trade", routes: null
            },
            props: [{
                name: "name", type: "string", nullable: true
            }, {
                name: "age", type: "number", nullable: false
            }, {
                name: "email", type: "string", nullable: false, validation: [{
                    type: "email"
                }]
            }],
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ]
}
    ;