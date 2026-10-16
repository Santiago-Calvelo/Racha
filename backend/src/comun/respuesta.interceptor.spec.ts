import { model, Types } from 'mongoose';
import { serializarRespuesta } from './respuesta.interceptor';
import { PersonaEsquema } from '../personas/entities/persona.entity';

describe('Serialización HTTP', () => {
  it('convierte documentos Mongoose y objetos lean sin mutar sus identificadores', () => {
    const Modelo = model('PersonaRespuestaTest', PersonaEsquema);
    const persona = new Modelo({
      nombre: 'Ana',
      alias: 'ana',
      email: 'ana@example.com',
      __v: 2,
    });
    const referencia = new Types.ObjectId();
    const resultado = serializarRespuesta({
      persona,
      items: [{ _id: referencia, __v: 1 }],
    });
    expect(resultado).toMatchObject({
      persona: { id: String(persona._id), nombre: 'Ana' },
      items: [{ id: String(referencia) }],
    });
    expect(JSON.stringify(resultado)).not.toMatch(/"(_id|__v)"/);
    expect(persona._id).toBeInstanceOf(Types.ObjectId);
    expect(persona.__v).toBe(2);
  });
});
