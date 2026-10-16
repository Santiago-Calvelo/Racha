import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Persona, PersonaDocumento } from '../personas/entities/persona.entity';
import {
  CategoriaDesafio,
  Desafio,
  DesafioDocumento,
} from '../desafios/entities/desafio.entity';
import {
  EstadoParticipacion,
  Participacion,
  ParticipacionDocumento,
} from '../participaciones/entities/participacion.entity';
import { ZONA_HORARIA_POR_DEFECTO } from '../comun/constantes';
import { hoyReferencia } from '../comun/fechas';

@Injectable()
export class SeedService {
  constructor(
    @InjectModel(Persona.name)
    private readonly personas: Model<PersonaDocumento>,
    @InjectModel(Desafio.name)
    private readonly desafios: Model<DesafioDocumento>,
    @InjectModel(Participacion.name)
    private readonly participaciones: Model<ParticipacionDocumento>,
    @InjectConnection() private readonly conexion: Connection,
  ) {}

  async ejecutar(): Promise<void> {
    await Promise.all(
      Object.values(this.conexion.models).map((modelo) => modelo.init()),
    );
    const personas = [];
    for (const [nombre, alias] of [
      ['Ana Demo', 'seed_ana'],
      ['Bruno Demo', 'seed_bruno'],
      ['Carla Demo', 'seed_carla'],
    ]) {
      personas.push(
        await this.personas
          .findOneAndUpdate(
            { alias },
            {
              $setOnInsert: {
                nombre,
                alias,
                email: `${alias}@example.com`,
                zonaHoraria: ZONA_HORARIA_POR_DEFECTO,
              },
            },
            { upsert: true, new: true, runValidators: true },
          )
          .exec(),
      );
    }

    const fechaInicio = hoyReferencia();
    const fin = new Date(`${fechaInicio}T12:00:00Z`);
    fin.setUTCDate(fin.getUTCDate() + 6);
    const fechaFin = fin.toISOString().slice(0, 10);
    const datos = [
      {
        nombre: 'Caminar cada día',
        categoria: CategoriaDesafio.SALUD,
        codigoInvitacion: 'DEMOA1',
      },
      {
        nombre: 'Leer cada día',
        categoria: CategoriaDesafio.ESTUDIO,
        codigoInvitacion: 'DEMOB2',
      },
    ];
    for (const [indice, dato] of datos.entries()) {
      const creador = personas[indice]._id;
      const candidato = new this.desafios({
        ...dato,
        creador,
        fechaInicio,
        fechaFin,
        maximoParticipantes: 10,
        fechaCancelacion: null,
      });
      await candidato.validate();
      const desafio = await this.desafios
        .findOneAndUpdate(
          { codigoInvitacion: dato.codigoInvitacion },
          { $setOnInsert: candidato.toObject() },
          { upsert: true, new: true },
        )
        .exec();
      await this.participaciones
        .updateOne(
          { persona: desafio.creador, desafio: desafio._id },
          {
            $setOnInsert: {
              estado: EstadoParticipacion.ACTIVA,
              fechaIngreso: new Date(),
              fechaAbandono: null,
            },
          },
          { upsert: true, runValidators: true },
        )
        .exec();
    }
  }
}
