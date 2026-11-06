import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Persona } from '../personas/entities/persona.entity';
import type { Identidad } from './token.service';

@Injectable()
export class PersonaAuthService {
  constructor(@InjectModel(Persona.name) private readonly personas: Model<Persona>) {}
  async resolver(identidad: Identidad, token: string) {
    const filtro = { emisor: identidad.emisor, sujeto: identidad.sujeto };
    const existente = await this.personas.findOne(filtro).lean().exec();
    if (existente) return existente;
    const respuesta = await fetch(new URL('userinfo', identidad.emisor), {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000),
    });
    if (!respuesta.ok) throw new UnauthorizedException('No se pudo verificar el perfil de Auth0');
    const perfil: unknown = await respuesta.json();
    if (!perfil || typeof perfil !== 'object' || !('sub' in perfil) || perfil.sub !== identidad.sujeto)
      throw new UnauthorizedException('El perfil no corresponde a la sesión');
    const nombre = 'name' in perfil && typeof perfil.name === 'string' ? perfil.name : 'Participante';
    const email = 'email' in perfil && typeof perfil.email === 'string' ? perfil.email : undefined;
    try {
      const persona = await this.personas.findOneAndUpdate(filtro, {
        $setOnInsert: { ...filtro, proveedor: identidad.sujeto.split('|')[0], nombre, email },
      }, { upsert: true, new: true, runValidators: true }).lean().exec();
      if (!persona) throw new Error('No se pudo crear la persona');
      return persona;
    } catch (e) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 11000) {
        const ganadora = await this.personas.findOne(filtro).lean().exec();
        if (ganadora) return ganadora;
      }
      throw e;
    }
  }
  async alias(id: string, alias: string) {
    if (!/^[a-z0-9_]{3,20}$/.test(alias)) throw new BadRequestException('Elegí entre 3 y 20 letras, números o guion bajo');
    try {
      const persona = await this.personas.findOneAndUpdate(
        { _id: id, alias: null }, { $set: { alias } }, { new: true, runValidators: true },
      ).lean().exec();
      if (!persona) throw new ConflictException('El alias ya fue elegido');
      return persona;
    } catch (e) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 11000)
        throw new ConflictException('Ese alias ya está en uso. Elegí otro');
      throw e;
    }
  }
}
