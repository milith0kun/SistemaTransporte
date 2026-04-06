import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Route } from './route.entity';
import { Municipality } from './municipality.entity';
import { User } from './user.entity';

export enum TipoZona {
  URBANA       = 'URBANA',
  CARRETERA    = 'CARRETERA',
  ZONA_ESCOLAR = 'ZONA_ESCOLAR',
  CURVAS       = 'CURVAS',
  GENERAL      = 'GENERAL',
}

@Entity('speed_configs')
export class SpeedConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ nullable: true })
  route_id: string;

  @ManyToOne(() => Route, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'route_id' })
  route: Route;

  @Index()
  @Column()
  municipality_id: string;

  @ManyToOne(() => Municipality, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'municipality_id' })
  municipality: Municipality;

  /** Límite superior (km/h). Superarlo (+ tolerancia) genera alerta */
  @Column({ type: 'int' })
  velocidad_maxima_kmh: number;

  /** Velocidad a la que el ciudadano recibe advertencia visual */
  @Column({ type: 'int' })
  velocidad_alerta_kmh: number;

  /** Velocidad crítica → alerta inmediata de mayor prioridad */
  @Column({ type: 'int', default: 100 })
  velocidad_critica_kmh: number;

  /** Margen de error del GPS (se suma al límite antes de alertar) */
  @Column({ type: 'int', default: 5 })
  tolerancia_kmh: number;

  /** Duración mínima del exceso (segundos) para generar alerta */
  @Column({ type: 'int', default: 10 })
  duracion_minima_segundos: number;

  @Column({ type: 'enum', enum: TipoZona, default: TipoZona.GENERAL })
  tipo_zona: TipoZona;

  @Column({ nullable: true, length: 500 })
  descripcion: string;

  @Column({ default: true })
  activo: boolean;

  @Column()
  created_by: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
