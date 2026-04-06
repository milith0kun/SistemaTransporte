import { MigrationInterface, QueryRunner } from 'typeorm';

export class SpeedModule1743811200000 implements MigrationInterface {
  name = 'SpeedModule1743811200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ENUMs
    await queryRunner.query(`
      CREATE TYPE "tipo_zona_enum" AS ENUM ('URBANA', 'CARRETERA', 'ZONA_ESCOLAR', 'CURVAS', 'GENERAL')
    `);
    await queryRunner.query(`
      CREATE TYPE "speed_alert_severity_enum" AS ENUM ('ADVERTENCIA', 'MODERADO', 'GRAVE', 'CRITICO')
    `);
    await queryRunner.query(`
      CREATE TYPE "speed_alert_status_enum" AS ENUM ('ACTIVA', 'VISTA_FISCAL', 'VISTA_OPERADOR', 'RESUELTA', 'FALSO_POSITIVO')
    `);

    // speed_configs
    await queryRunner.query(`
      CREATE TABLE "speed_configs" (
        "id"                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "route_id"                  UUID REFERENCES "routes"("id") ON DELETE SET NULL,
        "municipality_id"           UUID NOT NULL REFERENCES "municipalities"("id") ON DELETE RESTRICT,
        "velocidad_maxima_kmh"      INT NOT NULL,
        "velocidad_alerta_kmh"      INT NOT NULL,
        "velocidad_critica_kmh"     INT NOT NULL DEFAULT 100,
        "tolerancia_kmh"            INT NOT NULL DEFAULT 5,
        "duracion_minima_segundos"  INT NOT NULL DEFAULT 10,
        "tipo_zona"                 "tipo_zona_enum" NOT NULL DEFAULT 'GENERAL',
        "descripcion"               VARCHAR(500),
        "activo"                    BOOLEAN NOT NULL DEFAULT TRUE,
        "created_by"                UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at"                TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"                TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_speed_configs_municipality" ON "speed_configs" ("municipality_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_speed_configs_route" ON "speed_configs" ("route_id")`);

    // speed_alerts
    await queryRunner.query(`
      CREATE TABLE "speed_alerts" (
        "id"                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "trip_id"                         UUID NOT NULL REFERENCES "trips"("id") ON DELETE RESTRICT,
        "vehicle_id"                      UUID NOT NULL REFERENCES "vehicles"("id") ON DELETE RESTRICT,
        "driver_id"                       UUID REFERENCES "drivers"("id") ON DELETE SET NULL,
        "reported_by"                     UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "municipality_id"                 UUID NOT NULL,
        "velocidad_detectada_kmh"         DECIMAL(6,2) NOT NULL,
        "velocidad_limite_kmh"            INT NOT NULL,
        "exceso_kmh"                      INT NOT NULL,
        "duracion_exceso_segundos"        INT NOT NULL,
        "velocidad_maxima_registrada_kmh" DECIMAL(6,2),
        "latitud"                         DECIMAL(10,7) NOT NULL,
        "longitud"                        DECIMAL(10,7) NOT NULL,
        "ubicacion_descripcion"           VARCHAR(500),
        "severidad"                       "speed_alert_severity_enum" NOT NULL,
        "estado"                          "speed_alert_status_enum" NOT NULL DEFAULT 'ACTIVA',
        "resuelto_por"                    UUID,
        "notas_resolucion"               VARCHAR(1000),
        "derivo_sancion"                  BOOLEAN NOT NULL DEFAULT FALSE,
        "sanction_id"                     UUID,
        "gps_trail"                       JSONB,
        "created_at"                      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"                      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_speed_alerts_trip"         ON "speed_alerts" ("trip_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_speed_alerts_vehicle"      ON "speed_alerts" ("vehicle_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_speed_alerts_driver"       ON "speed_alerts" ("driver_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_speed_alerts_municipality" ON "speed_alerts" ("municipality_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_speed_alerts_severidad"    ON "speed_alerts" ("severidad")`);
    await queryRunner.query(`CREATE INDEX "IDX_speed_alerts_estado"       ON "speed_alerts" ("estado")`);
    await queryRunner.query(`CREATE INDEX "IDX_speed_alerts_created_at"   ON "speed_alerts" ("created_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "speed_alerts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "speed_configs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "speed_alert_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "speed_alert_severity_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tipo_zona_enum"`);
  }
}
