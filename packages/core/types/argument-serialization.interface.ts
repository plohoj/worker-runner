import { ArgumentsDeserializer } from '../arguments-serialization/arguments-deserializer';
import { ArgumentsSerializer } from '../arguments-serialization/arguments-serializer';

export interface IArgumentSerialization {
    serializer: ArgumentsSerializer;
    deserializer: ArgumentsDeserializer;
}
