import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/** Ajusta únicamente índices del modelo aprobado; conserva todos los documentos. */
@Injectable()
export class IndicesAuthService {
  constructor(@InjectConnection() private readonly conexion: Connection) {}
  async preparar() {
    const personas = this.conexion.collection('personas');
    let indices: Awaited<ReturnType<typeof personas.indexes>>;
    try { indices = await personas.indexes(); }
    catch (e) {
      if (!(e && typeof e === 'object' && 'code' in e && e.code === 26)) throw e;
      indices = [];
    }
    for (const indice of indices) {
      if ((indice.name === 'alias_1' && !indice.partialFilterExpression) || indice.name === 'email_1')
        await personas.dropIndex(indice.name);
    }
    for (const modelo of Object.values(this.conexion.models)) await modelo.createIndexes();
  }
}
