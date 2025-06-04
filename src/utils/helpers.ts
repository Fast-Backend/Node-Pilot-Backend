import pluralize from 'pluralize';
import { FieldType, Properties } from '../types/workflow';

export function pluralizeWord(word: string): string {
    if (!word || typeof word !== 'string') return word;

    return pluralize(word);;
}

export const capitalize = (name: string) => {
    const data = name.charAt(0).toUpperCase() + name.slice(1);
    return data
}

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