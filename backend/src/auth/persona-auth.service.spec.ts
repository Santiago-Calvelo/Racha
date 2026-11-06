import { Model, Types } from 'mongoose';
import { Persona } from '../personas/entities/persona.entity';
import { PersonaAuthService } from './persona-auth.service';

describe('Vinculación y elección de alias', () => {
  const consulta = (valor: unknown) => ({ lean: () => ({ exec: async () => valor }) });
  const identidad = { emisor: 'https://test.auth0.com/', sujeto: 'google-oauth2|123', expira: 9999999999 };
  const persona = { _id: new Types.ObjectId(), nombre: 'Ana', ...identidad };
  const modelo = { findOne: jest.fn(), findOneAndUpdate: jest.fn() };
  let servicio: PersonaAuthService;
  beforeEach(() => {
    jest.resetAllMocks();
    servicio = new PersonaAuthService(modelo as unknown as Model<Persona>);
  });
  it('reconoce por emisor/sub y no consulta email ni el proveedor nuevamente', async () => {
    modelo.findOne.mockReturnValue(consulta(persona));
    expect(await servicio.resolver(identidad, 'token')).toEqual(persona);
    expect(modelo.findOne).toHaveBeenCalledWith({ emisor: identidad.emisor, sujeto: identidad.sujeto });
    expect(modelo.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('crea desde userinfo verificado, sin adjudicar alias ni enlazar por email', async () => {
    modelo.findOne.mockReturnValue(consulta(null));
    modelo.findOneAndUpdate.mockReturnValue(consulta(persona));
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ sub: identidad.sujeto, name: 'Ana', email: 'ana@example.com' })));
    try {
      await servicio.resolver(identidad, 'token');
      expect(modelo.findOneAndUpdate).toHaveBeenCalledWith(
        { emisor: identidad.emisor, sujeto: identidad.sujeto },
        { $setOnInsert: { emisor: identidad.emisor, sujeto: identidad.sujeto, proveedor: 'google-oauth2', nombre: 'Ana', email: 'ana@example.com' } },
        { upsert: true, new: true, runValidators: true },
      );
    } finally { fetchMock.mockRestore(); }
  });
  it('convierte la colisión concurrente del índice único en un conflicto comprensible', async () => {
    modelo.findOneAndUpdate.mockImplementation(() => { throw { code: 11000 }; });
    await expect(servicio.alias(String(persona._id), 'ana')).rejects.toThrow('Ese alias ya está en uso');
  });
  it('impide elegir un alias inválido o reemplazar uno ya elegido', async () => {
    await expect(servicio.alias(String(persona._id), 'x')).rejects.toThrow('Elegí entre');
    modelo.findOneAndUpdate.mockReturnValue(consulta(null));
    await expect(servicio.alias(String(persona._id), 'ana')).rejects.toThrow('El alias ya fue elegido');
  });
});
