-- Backlog final: el administrador registra a los usuarios (HU01), las credenciales son propias (HU02)
-- y los días de atención salen del menú publicado (HU03). Reemplaza el modelo v2 (API empresarial,
-- feriados). Las tablas v2 solo tenían datos de prueba del simulador, así que se borran.
DROP TABLE IF EXISTS "public"."sesion", "public"."almuerzo", "public"."pension", "public"."feriado",
  "public"."autorizacion", "public"."persona" CASCADE;
DROP TYPE IF EXISTS "public"."Rol", "public"."TipoPersona", "public"."OrigenAlmuerzo", "public"."EstadoAlmuerzo";

-- CreateEnum
CREATE TYPE "public"."TipoUsuario" AS ENUM ('ADMINISTRADOR', 'EMPLEADO');

-- CreateEnum
CREATE TYPE "public"."TipoPersona" AS ENUM ('EMPLEADO', 'FAMILIAR');

-- CreateEnum
CREATE TYPE "public"."Parentesco" AS ENUM ('CONYUGE', 'HIJO', 'HIJA', 'PADRE', 'MADRE');

-- CreateEnum
CREATE TYPE "public"."Modalidad" AS ENUM ('NO_PENSIONADO', 'PENSIONADO');

-- CreateEnum
CREATE TYPE "public"."EstadoReserva" AS ENUM ('CONFIRMADA', 'CANCELADA', 'INASISTENCIA_AVISADA');

-- CreateTable
CREATE TABLE "public"."persona" (
    "id" UUID NOT NULL,
    "tipo" "public"."TipoPersona" NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "ci" TEXT NOT NULL,
    "fecha_nacimiento" DATE NOT NULL,
    "telefono" TEXT NOT NULL,
    "parentesco" "public"."Parentesco",
    "titular_id" UUID NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creada_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizada_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cuenta" (
    "persona_id" UUID NOT NULL,
    "codigo_empleado" TEXT NOT NULL,
    "nombre_usuario" TEXT NOT NULL,
    "contrasena_hash" TEXT NOT NULL,
    "tipo" "public"."TipoUsuario" NOT NULL,
    "debe_cambiar_contrasena" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cuenta_pkey" PRIMARY KEY ("persona_id")
);

-- CreateTable
CREATE TABLE "public"."menu_semanal" (
    "lunes" DATE NOT NULL,
    "publicado_el" DATE NOT NULL,

    CONSTRAINT "menu_semanal_pkey" PRIMARY KEY ("lunes")
);

-- CreateTable
CREATE TABLE "public"."menu_dia" (
    "fecha" DATE NOT NULL,
    "lunes" DATE NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "menu_dia_pkey" PRIMARY KEY ("fecha")
);

-- CreateTable
CREATE TABLE "public"."reserva" (
    "persona_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "titular_id" UUID NOT NULL,
    "modalidad" "public"."Modalidad" NOT NULL,
    "precio_bs" INTEGER NOT NULL,
    "estado" "public"."EstadoReserva" NOT NULL,
    "creada_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizada_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reserva_pkey" PRIMARY KEY ("persona_id","fecha")
);

-- CreateTable
CREATE TABLE "public"."pension" (
    "persona_id" UUID NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "titular_id" UUID NOT NULL,
    "solicitada_el" DATE NOT NULL,

    CONSTRAINT "pension_pkey" PRIMARY KEY ("persona_id","anio","mes")
);

-- CreateTable
CREATE TABLE "public"."sesion" (
    "token_hash" TEXT NOT NULL,
    "persona_id" UUID NOT NULL,
    "creada_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultima_actividad" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sesion_pkey" PRIMARY KEY ("token_hash")
);

-- CreateIndex
CREATE UNIQUE INDEX "persona_ci_key" ON "public"."persona"("ci");

-- CreateIndex
CREATE INDEX "persona_titular_id_idx" ON "public"."persona"("titular_id");

-- CreateIndex
CREATE UNIQUE INDEX "cuenta_codigo_empleado_key" ON "public"."cuenta"("codigo_empleado");

-- CreateIndex
CREATE UNIQUE INDEX "cuenta_nombre_usuario_key" ON "public"."cuenta"("nombre_usuario");

-- CreateIndex
CREATE INDEX "menu_dia_lunes_idx" ON "public"."menu_dia"("lunes");

-- CreateIndex
CREATE INDEX "reserva_fecha_estado_idx" ON "public"."reserva"("fecha", "estado");

-- CreateIndex
CREATE INDEX "reserva_titular_id_fecha_idx" ON "public"."reserva"("titular_id", "fecha");

-- CreateIndex
CREATE INDEX "pension_anio_mes_idx" ON "public"."pension"("anio", "mes");

-- CreateIndex
CREATE INDEX "pension_titular_id_anio_mes_idx" ON "public"."pension"("titular_id", "anio", "mes");

-- CreateIndex
CREATE INDEX "sesion_persona_id_idx" ON "public"."sesion"("persona_id");

-- AddForeignKey
ALTER TABLE "public"."persona" ADD CONSTRAINT "persona_titular_id_fkey" FOREIGN KEY ("titular_id") REFERENCES "public"."persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cuenta" ADD CONSTRAINT "cuenta_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "public"."persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."menu_dia" ADD CONSTRAINT "menu_dia_lunes_fkey" FOREIGN KEY ("lunes") REFERENCES "public"."menu_semanal"("lunes") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reserva" ADD CONSTRAINT "reserva_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "public"."persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reserva" ADD CONSTRAINT "reserva_titular_id_fkey" FOREIGN KEY ("titular_id") REFERENCES "public"."persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reserva" ADD CONSTRAINT "reserva_fecha_fkey" FOREIGN KEY ("fecha") REFERENCES "public"."menu_dia"("fecha") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pension" ADD CONSTRAINT "pension_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "public"."persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sesion" ADD CONSTRAINT "sesion_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "public"."cuenta"("persona_id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Reglas que Prisma no expresa en el esquema. El dominio ya las cumple;
-- la base las repite para que un INSERT manual tampoco pueda romperlas.
ALTER TABLE "public"."reserva" ADD CONSTRAINT "reserva_precio_valido"
    CHECK (("modalidad" = 'NO_PENSIONADO' AND "precio_bs" = 18) OR ("modalidad" = 'PENSIONADO' AND "precio_bs" = 15));
ALTER TABLE "public"."menu_dia" ADD CONSTRAINT "menu_dia_lunes_a_jueves"
    CHECK (EXTRACT(ISODOW FROM "fecha") BETWEEN 1 AND 4 AND "fecha" - "lunes" BETWEEN 0 AND 3);
ALTER TABLE "public"."menu_semanal" ADD CONSTRAINT "menu_semanal_es_lunes" CHECK (EXTRACT(ISODOW FROM "lunes") = 1);
ALTER TABLE "public"."pension" ADD CONSTRAINT "pension_mes_valido" CHECK ("mes" BETWEEN 1 AND 12);
ALTER TABLE "public"."persona" ADD CONSTRAINT "persona_tipo_coherente"
    CHECK (("tipo" = 'EMPLEADO' AND "titular_id" = "id" AND "parentesco" IS NULL)
        OR ("tipo" = 'FAMILIAR' AND "titular_id" <> "id" AND "parentesco" IS NOT NULL));

-- En Supabase, cada tabla de "public" queda publicada en su API de datos con la clave anon.
-- Con RLS activo y sin políticas, esa API no lee ni escribe nada: el único acceso es el
-- servidor del restaurante, que se conecta como dueño de las tablas y pasa por las reglas.
ALTER TABLE "public"."persona" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cuenta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."menu_semanal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."menu_dia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."reserva" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pension" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sesion" ENABLE ROW LEVEL SECURITY;
