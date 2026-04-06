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
import { Trip }    from './trip.entity';
import { Vehicle } from './vehicle.entity';
import { Driver }  from './driver.entity';
import { User }    from './user.entity';

export enum SpeedAlertSeverity {
  ADVERTENCIA = 'ADVERTENCIA',
  MODERADO    = 'MODERADO',
  GRAVE       = 'GRAVE',
  CRITICO     = 'CRITICO',
}

export enum SpeedAlertStatus {
  ACTIVA          = 'ACTIVA',
  VISTA_FISCAL    = 'VISTA_FISCAL',
  VISTA_OPERADOR  = 'VISTA_OPERADOR',
  RESUELTA        = 'RESUELTA',
  FALSO_POSITIVO  = 'FALSO_POSITIVO',
}

@Entity('speed_alerts')
export class SpeedAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  trip_id: string;

  @ManyToOne(() => Trip, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Index()
  @Column()
  vehicle_id: string;

  @ManyToOne(() => Vehicle, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Index()
  @Column({ nullable: true })
  driver_id: string;

  @ManyToOne(() => Driver, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  /** Ciudadano que tenía el tacómetro activo */
  @Column()
  reported_by: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reported_by' })
  reporter: User;

  @Index()
  @Column()
  municipality_id: string;

  // ── Datos de velocidad ──────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  velocidad_detectada_kmh: number;

  @Column({ type: 'int' })
  velocidad_limite_kmh: number;

  @Column({ type: 'int' })
  exceso_kmh: number;

  @Column({ type: 'int' })
  duracion_exceso_segundos: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  velocidad_maxima_registrada_kmh: number;

  // ── Ubicación GPS ──────────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitud: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitud: number;

  @Column({ nullable: true, length: 500 })
  ubicacion_descripcion: string;

  // ── Clasificación ──────────────────────────────────────────────────────────

  @Index()
  @Column({ type: 'enum', enum: SpeedAlertSeverity })
  severidad: SpeedAlertSeverity;

  @Index()
  @Column({ type: 'enum', enum: SpeedAlertStatus, default: SpeedAlertStatus.ACTIVA })
  estado: SpeedAlertStatus;

  @Column({ nullable: true })
  resuelto_por: string;

  @Column({ nullable: true, length: 1000 })
  notas_resolucion: string;

  @Column({ type: 'boolean', default: false })
  derivo_sancion: boolean;

  @Column({ nullable: true })
  sanction_id: string;

  /** Trail GPS durante el exceso (evidencia) */
  @Column({ type: 'jsonb', nullable: true })
  gps_trail: { lat: number; lng: number; speed_kmh: number; timestamp: string }[];

  @Index()
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
