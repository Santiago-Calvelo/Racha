import { validarEntorno } from './validar-entorno';

describe('validarEntorno', () => {
  it('acepta una URI no vacía y la recorta', () => {
    expect(validarEntorno({ MONGODB_URI: '  mongodb://local  ', AUTH0_DOMAIN: 'test.auth0.com', AUTH0_AUDIENCE: 'https://racha.api' })).toEqual({
      MONGODB_URI: 'mongodb://local', AUTH0_DOMAIN: 'test.auth0.com', AUTH0_AUDIENCE: 'https://racha.api',
    });
  });

  it('falla con mensaje seguro si falta la URI', () => {
    expect(() => validarEntorno({})).toThrow(
      'Falta la variable de entorno MONGODB_URI',
    );
    expect(() => validarEntorno({ MONGODB_URI: '   ' })).toThrow(
      'Falta la variable de entorno MONGODB_URI',
    );
  });

  it('no expone secretos en el mensaje de error', () => {
    const secreto = 'mongodb+srv://usuario:secreto@cluster/db';
    try {
      validarEntorno({ MONGODB_URI: '' });
      fail('debería lanzar');
    } catch (error) {
      expect(String(error)).not.toContain(secreto);
    }
  });
});
