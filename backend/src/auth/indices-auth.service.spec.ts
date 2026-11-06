import type { Connection } from 'mongoose';
import { IndicesAuthService } from './indices-auth.service';
describe('Preparación de índices Auth0', () => {
  it('reemplaza solo los dos índices antiguos y crea los declarados antes del seed', async () => {
    const pasos: string[] = [];
    const conexion = {
      collection: () => ({
        indexes: async () => [{ name: '_id_' }, { name: 'alias_1' }, { name: 'email_1' }, { name: 'indice_de_otra_funcionalidad' }],
        dropIndex: async (nombre: string) => { pasos.push(nombre); },
      }),
      models: { Persona: { createIndexes: async () => { pasos.push('crear'); } } },
    } as unknown as Connection;
    await new IndicesAuthService(conexion).preparar();
    expect(pasos).toEqual(['alias_1', 'email_1', 'crear']);
  });
  it('no elimina el índice parcial ya migrado ni oculta errores de permisos', async () => {
    const dropIndex = jest.fn();
    const indices = { indexes: async () => [{ name: 'alias_1', partialFilterExpression: { alias: { $type: 'string' } } }], dropIndex };
    const conexion = { collection: () => indices, models: {} } as unknown as Connection;
    await new IndicesAuthService(conexion).preparar();
    expect(dropIndex).not.toHaveBeenCalled();
    indices.indexes = async () => { throw new Error('Sin permisos'); };
    await expect(new IndicesAuthService(conexion).preparar()).rejects.toThrow('Sin permisos');
  });
});
