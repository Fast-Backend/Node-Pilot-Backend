// export type WorkflowStep = {
//     type: 'controller' | 'route' | 'service' | 'model';
//     name: string;
//     method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
//     path?: string;
//     usesService?: boolean;
// };

// export type RouteMethods = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'GET_ID';

// type Controller = {
//     name: string,
//     routes: RouteMethods[] | null;
// }

export type Workflows = {
    id: string;
    name: string;
    workflows: Workflow[]
    cors?: CorsOptionsCustom;
}

export type Workflow = {
    id: string;
    name: string,
    // routes: RouteMethods[] | null;
    props?: Properties[]
    createdAt: Date;
    updatedAt: Date;
    relations?: Relation[];
    cardId?: string;
    dimensions?: {
        width: number, height: number
    }
    position?: {
        x: number, y: number
    };
};

export type Relation = {
    relation: "one-to-one" | "one-to-many" | "many-to-many";
    isParent: boolean;
    controller: string;
}

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

type StaticOrigin = boolean | string | RegExp | (string | RegExp)[];

type CorsHttpMethod =
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'DELETE'
    | 'PATCH'
    | 'OPTIONS'
    | 'HEAD'
    | 'CONNECT'
    | 'TRACE';

type CorsAllowedHeader =
    | 'Accept'
    | 'Authorization'
    | 'Content-Type'
    | 'Origin'
    | 'X-Requested-With'
    | 'Access-Control-Allow-Origin'
    | 'Access-Control-Allow-Headers'
    | 'Cache-Control'
    | 'Pragma'

type CorsExposedHeader =
    | 'Content-Length'
    | 'X-Knowledge-Base-Version'
    | 'X-Request-ID'
    | 'X-RateLimit-Limit'
    | 'X-RateLimit-Remaining'
    | 'X-RateLimit-Reset'
    | 'Authorization'
    | string; // fallback for custom headers

export type CorsOptionsCustom = {
    origin?: StaticOrigin;
    methods?: CorsHttpMethod | CorsHttpMethod[];
    allowedHeaders?: CorsAllowedHeader | CorsAllowedHeader[];
    exposedHeaders?: CorsExposedHeader | CorsExposedHeader[];
    credentials?: boolean;
    maxAge?: number;
    preflightContinue?: boolean;
    optionsSuccessStatus?: number;
};