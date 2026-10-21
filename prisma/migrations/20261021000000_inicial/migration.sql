-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Rol" AS ENUM ('EMPLEADO', 'ENCARGADO');

-- CreateEnum
CREATE TYPE "public"."TipoPersona" AS ENUM ('EMPLEADO', 'FAMILIAR');

-- CreateEnum
CREATE TYPE "public"."OrigenAlmuerzo" AS ENUM ('ESPORADICO', 'PENSION');

-- CreateEnum
CREATE TYPE "public"."EstadoAlmuerzo" AS ENUM ('CONFIRMADO', 'CANCELADO', 'INASISTENCIA_AVISADA');

-- CreateTable
CREATE TABLE "public"."persona" (
    "id" TEXT NOT NULL,
    "tipo" "public"."TipoPersona" NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "parentesco" TEXT,
    "codigo_titular" TEXT NOT NULL,
    "vigente" BOOLEAN NOT NULL,
    "actualizada_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."autorizacion" (
    "codigo_empleado" TEXT NOT NULL,
    "rol" "public"."Rol" NOT NULL,

    CONSTRAINT "autorizacion_pkey" PRIMARY KEY ("codigo_empleado")
);

-- CreateTable
CREATE TABLE "public"."almuerzo" (
    "persona_id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "codigo_titular" TEXT NOT NULL,
    "origen" "public"."OrigenAlmuerzo" NOT NULL,
    "precio_bs" INTEGER NOT NULL,
    "estado" "public"."EstadoAlmuerzo" NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "almuerzo_pkey" PRIMARY KEY ("persona_id","fecha")
);

-- CreateTable
CREATE TABLE "public"."pension" (
    "persona_id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "codigo_titular" TEXT NOT NULL,
    "solicitada_el" DATE NOT NULL,

    CONSTRAINT "pension_pkey" PRIMARY KEY ("persona_id","anio","mes")
);

-- CreateTable
CREATE TABLE "public"."feriado" (
    "fecha" DATE NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "feriado_pkey" PRIMARY KEY ("fecha")
);

-- CreateTable
CREATE TABLE "public"."sesion" (
    "token_hash" TEXT NOT NULL,
    "codigo_empleado" TEXT NOT NULL,
    "rol" "public"."Rol" NOT NULL,
    "creada_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultima_actividad" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sesion_pkey" PRIMARY KEY ("token_hash")
);

-- CreateIndex
CREATE INDEX "persona_codigo_titular_idx" ON "public"."persona"("codigo_titular");

-- CreateIndex
CREATE INDEX "almuerzo_fecha_estado_idx" ON "public"."almuerzo"("fecha", "estado");

-- CreateIndex
CREATE INDEX "almuerzo_codigo_titular_fecha_idx" ON "public"."almuerzo"("codigo_titular", "fecha");

-- CreateIndex
CREATE INDEX "pension_codigo_titular_anio_mes_idx" ON "public"."pension"("codigo_titular", "anio", "mes");

-- CreateIndex
CREATE INDEX "sesion_codigo_empleado_idx" ON "public"."sesion"("codigo_empleado");

-- AddForeignKey
ALTER TABLE "public"."persona" ADD CONSTRAINT "persona_codigo_titular_fkey" FOREIGN KEY ("codigo_titular") REFERENCES "public"."persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."almuerzo" ADD CONSTRAINT "almuerzo_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "public"."persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pension" ADD CONSTRAINT "pension_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "public"."persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Reglas que Prisma no expresa en el esquema. El dominio ya las cumple;
-- la base las repite para que un INSERT manual tampoco pueda romperlas.
ALTER TABLE "public"."almuerzo" ADD CONSTRAINT "almuerzo_precio_valido"
    CHECK (("origen" = 'ESPORADICO' AND "precio_bs" = 18) OR ("origen" = 'PENSION' AND "precio_bs" = 15));
ALTER TABLE "public"."almuerzo" ADD CONSTRAINT "almuerzo_lunes_a_jueves"
    CHECK (EXTRACT(ISODOW FROM "fecha") BETWEEN 1 AND 4);
ALTER TABLE "public"."pension" ADD CONSTRAINT "pension_mes_valido" CHECK ("mes" BETWEEN 1 AND 12);
ALTER TABLE "public"."persona" ADD CONSTRAINT "persona_empleado_es_su_titular"
    CHECK (("tipo" = 'EMPLEADO' AND "codigo_titular" = "id") OR ("tipo" = 'FAMILIAR' AND "codigo_titular" <> "id"));

-- En Supabase, cada tabla de "public" queda publicada en su API de datos con la clave anon.
-- Con RLS activo y sin políticas, esa API no lee ni escribe nada: el único acceso es el
-- servidor del restaurante, que se conecta como dueño de las tablas y pasa por las reglas.
ALTER TABLE "public"."persona" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."autorizacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."almuerzo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pension" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."feriado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sesion" ENABLE ROW LEVEL SECURITY;
