// export type WorkflowStep = {
//     type: 'controller' | 'route' | 'service' | 'model';
//     name: string;
//     method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
//     path?: string;
//     usesService?: boolean;
// };

export type RouteMethods = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'GET_ID';

type Controller = {
    name: string,
    routes: RouteMethods[] | null;
}

export type Workflows = {
    id: string;
    name: string;
    workflows: Workflow[]
}

export type Workflow = {
    id: string;
    controllers: Controller;
    props?: Properties[]
    createdAt: Date;
    updatedAt: Date;
};

export type Properties = {
    name: string;
    type: FieldType;
    nullable: boolean;
    validation?: ValidationRule[];
}

type ValidationRule =
    | { type: 'minLength'; value: number }
    | { type: 'maxLength'; value: number }
    | { type: 'pattern'; value: string } // regex
    | { type: 'min'; value: number } // for numbers or dates
    | { type: 'max'; value: number }
    | { type: 'email' }
    | { type: 'url' }
    | { type: 'uuid' }
    | { type: 'enum'; values: string[] }
    | { type: 'startsWith'; value: string }
    | { type: 'endsWith'; value: string }
    | { type: 'custom'; validator: string } // function name or logic

export type FieldType =
    | 'string'
    | 'number'
    | 'boolean'
    | 'bigint'
    | 'symbol'
    | 'undefined'
    | 'null'
    | 'object'
    | 'array'
    | 'function'
    | 'date'
    | 'any'
    | 'unknown'
    | 'void'
    | 'never'
    | 'json'
    | (string & {}); // allows custom string types

export type UserType = {
    name?: string | null;
    age: number;
};
