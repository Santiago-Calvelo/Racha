import { BadRequestException } from '@nestjs/common';
import {
  validarCategoria,
  validarDescripcion,
  validarFechasYCupo,
  validarNombre,
} from './desafios.validadores';
import { CategoriaDesafio } from './entities/desafio.entity';

describe('desafios.validadores', () => {
  it('valida nombre entre 3 y 60 caracteres', () => {
    expect(validarNombre('  Reto  ')).toBe('Reto');
    expect(() => validarNombre('ab')).toThrow(BadRequestException);
    expect(() => validarNombre('   ')).toThrow(BadRequestException);
  });

  it('limita la descripción a 280 caracteres', () => {
    expect(validarDescripcion(undefined)).toBeUndefined();
    expect(() => validarDescripcion('x'.repeat(281))).toThrow(
      BadRequestException,
    );
  });

  it('solo acepta las categorías del enum en español', () => {
    expect(validarCategoria('SALUD')).toBe(CategoriaDesafio.SALUD);
    expect(() => validarCategoria('HEALTH')).toThrow(BadRequestException);
  });

  it('exige duración entre 3 y 90 días y no empezar en el pasado', () => {
    const valido = validarFechasYCupo(
      { fechaInicio: '2026-10-10', fechaFin: '2026-10-12' },
      '2026-10-09',
    );
    expect(valido.fechaInicio).toBe('2026-10-10');

    expect(() =>
      validarFechasYCupo(
        { fechaInicio: '2026-10-08', fechaFin: '2026-10-12' },
        '2026-10-09',
      ),
    ).toThrow('no puede comenzar en el pasado');
    expect(() =>
      validarFechasYCupo(
        { fechaInicio: '2026-10-10', fechaFin: '2026-10-11' },
        '2026-10-09',
      ),
    ).toThrow('entre 3 y 90 días');
    expect(() =>
      validarFechasYCupo(
        { fechaInicio: '2026-02-30', fechaFin: '2026-03-05' },
        '2026-10-09',
      ),
    ).toThrow('día real');
  });

  it('exige cupo entero entre 2 y 20', () => {
    expect(
      validarFechasYCupo(
        { fechaInicio: '2026-10-10', fechaFin: '2026-10-12' },
        '2026-10-09',
      ).maximoParticipantes,
    ).toBe(10);
    expect(() =>
      validarFechasYCupo(
        {
          fechaInicio: '2026-10-10',
          fechaFin: '2026-10-12',
          maximoParticipantes: 1,
        },
        '2026-10-09',
      ),
    ).toThrow('entre 2 y 20');
  });
});
