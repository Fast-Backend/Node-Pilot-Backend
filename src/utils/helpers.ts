import { FieldType, Properties } from '../types/workflow';

export const capitalize = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};

export const toCamelCase = (str: string): string => {
    return str.charAt(0).toLowerCase() + str.slice(1);
};

export const toKebabCase = (str: string): string => {
    return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .toLowerCase();
};

export const toSnakeCase = (str: string): string => {
    return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .toLowerCase();
};

export const validateEntityName = (name: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Check if name is empty
    if (!name || name.trim().length === 0) {
        errors.push('Entity name cannot be empty');
    }
    
    // Check for valid JavaScript identifier
    const jsIdentifierRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    if (!jsIdentifierRegex.test(name)) {
        errors.push('Entity name must be a valid JavaScript identifier');
    }
    
    // Check for reserved JavaScript keywords
    const reservedKeywords = [
        'abstract', 'arguments', 'await', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
        'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'double', 'else',
        'enum', 'eval', 'export', 'extends', 'false', 'final', 'finally', 'float', 'for',
        'function', 'goto', 'if', 'implements', 'import', 'in', 'instanceof', 'int', 'interface',
        'let', 'long', 'native', 'new', 'null', 'package', 'private', 'protected', 'public',
        'return', 'short', 'static', 'super', 'switch', 'synchronized', 'this', 'throw',
        'throws', 'transient', 'true', 'try', 'typeof', 'var', 'void', 'volatile', 'while',
        'with', 'yield'
    ];
    
    if (reservedKeywords.includes(name.toLowerCase())) {
        errors.push(`"${name}" is a reserved JavaScript keyword`);
    }
    
    // Check for common problematic names
    const problematicNames = ['constructor', 'prototype', 'toString', 'valueOf'];
    if (problematicNames.includes(name.toLowerCase())) {
        errors.push(`"${name}" conflicts with JavaScript built-in properties`);
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

export const validatePropertyName = (name: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Reuse entity name validation
    const entityValidation = validateEntityName(name);
    errors.push(...entityValidation.errors);
    
    // Additional property-specific validations
    const sqlReservedWords = [
        'select', 'from', 'where', 'insert', 'update', 'delete', 'create', 'drop', 'alter',
        'table', 'database', 'index', 'view', 'trigger', 'procedure', 'function', 'user',
        'group', 'order', 'by', 'having', 'group', 'union', 'join', 'inner', 'outer', 'left',
        'right', 'full', 'cross', 'on', 'as', 'and', 'or', 'not', 'null', 'is', 'like',
        'between', 'in', 'exists', 'any', 'all', 'some', 'case', 'when', 'then', 'else',
        'end', 'cast', 'convert', 'count', 'sum', 'avg', 'min', 'max', 'distinct'
    ];
    
    if (sqlReservedWords.includes(name.toLowerCase())) {
        errors.push(`"${name}" is a SQL reserved word and may cause issues`);
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

export const validateRelationships = (relations: any[]): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Group relations by entity pair to detect problematic cycles
    const relationPairs = new Map<string, { relations: any[], entities: Set<string> }>();
    
    relations.forEach(relation => {
        const entity1 = relation.entity;
        const entity2 = relation.controller;
        
        if (entity1 && entity2 && entity1 !== entity2) {
            const pairKey = [entity1, entity2].sort().join('->');
            
            if (!relationPairs.has(pairKey)) {
                relationPairs.set(pairKey, { 
                    relations: [], 
                    entities: new Set([entity1, entity2])
                });
            }
            relationPairs.get(pairKey)!.relations.push(relation);
        }
    });
    
    // Check for problematic circular inheritance patterns
    // Only flag as problematic if we have strict parent-child relationships forming a cycle
    const parentChildEdges = new Map<string, Set<string>>();
    
    relations.forEach(relation => {
        const entity = relation.entity;
        const controller = relation.controller;
        
        if (entity && controller && entity !== controller) {
            // Only consider one-to-one and one-to-many as potentially problematic for inheritance
            if (relation.relation === 'one-to-one' || relation.relation === 'one-to-many') {
                if (relation.isParent) {
                    // entity is parent of controller
                    if (!parentChildEdges.has(entity)) {
                        parentChildEdges.set(entity, new Set());
                    }
                    parentChildEdges.get(entity)!.add(controller);
                }
            }
        }
    });
    
    // Check for cycles in strict parent-child relationships
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (entity: string, path: string[] = []): boolean => {
        if (recursionStack.has(entity)) {
            const cycleStart = path.indexOf(entity);
            const cyclePath = path.slice(cycleStart).concat(entity);
            errors.push(`Circular inheritance detected: ${cyclePath.join(' → ')}`);
            return true;
        }
        
        if (visited.has(entity)) {
            return false;
        }
        
        visited.add(entity);
        recursionStack.add(entity);
        
        const children = parentChildEdges.get(entity) || new Set();
        for (const child of children) {
            if (hasCycle(child, [...path, entity])) {
                return true;
            }
        }
        
        recursionStack.delete(entity);
        return false;
    };
    
    // Only check entities that have parent-child relationships
    for (const entity of parentChildEdges.keys()) {
        if (!visited.has(entity)) {
            hasCycle(entity);
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

export const sanitizeInput = (input: string): string => {
    return input
        .trim()
        .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
        .replace(/\s+/g, ' '); // Normalize whitespace
};

export const generateUniqueId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const mapFieldType = (type: FieldType): string => {
    switch (type) {
        case 'string':
        case 'number':
        case 'boolean':
        case 'bigint':
        case 'symbol':
        case 'undefined':
        case 'null':
        case 'any':
        case 'unknown':
        case 'void':
        case 'never':
            return type;
        case 'object':
            return 'Record<string, any>';
        case 'array':
            return 'any[]';
        case 'function':
            return '(...args: any[]) => any';
        case 'date':
            return 'Date';
        case 'json':
            return 'Record<string, any>';
        default:
            return type; // custom string type like 'uuid', 'slug', etc.
    }
};

export const mapZodType = (prop: Properties) => {
    let base: string;
    switch (prop.type) {
        case 'string':
            base = 'z.string()';
            break;
        case 'number':
            base = 'z.number()';
            break;
        case 'boolean':
            base = 'z.boolean()';
            break;
        default:
            base = 'z.any()';
    }

    if (prop.nullable) base += '.nullable()';

    if (prop.validation) {
        for (const rule of prop.validation) {
            switch (rule.type) {
                case 'minLength':
                    base += `.min(${rule.value})`;
                    break;
                case 'maxLength':
                    base += `.max(${rule.value})`;
                    break;
                case 'pattern':
                    base += `.regex(/${rule.value}/)`;
                    break;
                case 'min':
                    base += `.min(${rule.value})`;
                    break;
                case 'max':
                    base += `.max(${rule.value})`;
                    break;
                case 'email':
                    base += `.email()`;
                    break;
                case 'uuid':
                    base += `.uuid()`;
                    break;
                case 'enum':
                    base = `z.enum([${rule.values.map((v) => `"${v}"`).join(', ')}])`;
                    break;
            }
        }
    }

    return base;
};