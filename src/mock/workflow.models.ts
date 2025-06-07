import { Workflow, Workflows } from "../types/workflow";

export const workflows: Workflows =
{
    id: "1",
    name: "Test",
    cors: {
        origin: ["https://example.com"]
    },
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
            relations: [
                {
                    controller: "trade",
                    relation: "one-to-many",
                    isParent: true
                }
            ],
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
            relations: [
                {
                    controller: "user",
                    relation: "one-to-many",
                    isParent: false
                }
            ],
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: '12343',
            controllers: {
                name: "blog", routes: null
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