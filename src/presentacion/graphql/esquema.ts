/**
 * Contrato GraphQL del restaurante. Es lo que consume el frontend del equipo.
 * Fechas: texto "AAAA-MM-DD", hora de Bolivia. Montos: bolivianos enteros.
 * La guía con ejemplos está en entregables/api-graphql.md.
 */
export const esquema = /* GraphQL */ `
  enum Rol {
    EMPLEADO
    ENCARGADO
  }

  enum TipoPersona {
    EMPLEADO
    FAMILIAR
  }

  enum Modalidad {
    ESPORADICO
    PENSION
  }

  enum EstadoAlmuerzo {
    CONFIRMADO
    CANCELADO
    INASISTENCIA_AVISADA
  }

  enum FormatoReporte {
    EXCEL
    PDF
  }

  "Quien consume: el empleado (su propio titular) o un familiar de primer grado."
  type Persona {
    id: ID!
    tipo: TipoPersona!
    nombreCompleto: String!
    parentesco: String
    codigoTitular: String!
  }

  type Usuario {
    codigoInstitucional: String!
    rol: Rol!
  }

  type Almuerzo {
    personaId: ID!
    "Solo viene en misAlmuerzos."
    nombrePersona: String
    codigoTitular: String!
    fecha: String!
    modalidad: Modalidad!
    precioBs: Int!
    estado: EstadoAlmuerzo!
  }

  type MiFamilia {
    titular: Persona!
    familiares: [Persona!]!
    "HU05: 1 + familiares registrados."
    topeDiario: Int!
  }

  type FilaDelDia {
    personaId: ID!
    nombre: String!
    tipoPersona: TipoPersona!
    parentesco: String
    codigoTitular: String!
    nombreTitular: String!
    modalidad: Modalidad!
  }

  type ListaDelDia {
    fecha: String!
    esFeriado: Boolean!
    total: Int!
    filas: [FilaDelDia!]!
  }

  type Feriado {
    fecha: String!
    descripcion: String!
  }

  type LineaDescuento {
    personaId: ID!
    nombreCompleto: String!
    tipo: TipoPersona!
    parentesco: String
    modalidad: Modalidad!
    cantidad: Int!
    precioUnitarioBs: Int!
    subtotalBs: Int!
  }

  type DescuentoTitular {
    codigoTitular: String!
    nombreTitular: String!
    lineas: [LineaDescuento!]!
    totalBs: Int!
  }

  type ReporteMensual {
    anio: Int!
    mes: Int!
    titulares: [DescuentoTitular!]!
    totalBs: Int!
    "GET con el mismo token devuelve el archivo (HU11 CA3)."
    urlExcel: String!
    urlPdf: String!
  }

  type ConsumoPersona {
    persona: Persona!
    pensionado: Boolean!
    lineas: [LineaDescuento!]!
    cantidad: Int!
    subtotalBs: Int!
    "Solo para pensionados: avisos que admite sin bajar de 10."
    inasistenciasDisponibles: Int
  }

  type MiConsumo {
    anio: Int!
    mes: Int!
    personas: [ConsumoPersona!]!
    totalBs: Int!
  }

  type Hoy {
    "Fecha actual en America/La_Paz."
    fecha: String!
    horaLimite: String!
    "Próximo día en que todavía se puede reservar."
    fechaSugerida: String!
  }

  type Query {
    "No requiere sesión."
    hoy: Hoy!
    yo: Usuario!
    miFamilia: MiFamilia!
    misAlmuerzos(anio: Int!, mes: Int!): [Almuerzo!]!
    miConsumo(anio: Int!, mes: Int!): MiConsumo!
    feriados(anio: Int!, mes: Int!): [Feriado!]!
    diasDeServicio(anio: Int!, mes: Int!): [String!]!
    "Solo encargado. Sin fecha, es hoy."
    listaDelDia(fecha: String): ListaDelDia!
    "Solo encargado."
    reporteMensual(anio: Int!, mes: Int!): ReporteMensual!
  }

  type SesionPayload {
    ok: Boolean!
    mensaje: String
    "Va en cada pedido siguiente como Authorization: Bearer <token>."
    token: String
    usuario: Usuario
    familia: MiFamilia
    minutosDeInactividad: Int!
  }

  type AlmuerzoPayload {
    ok: Boolean!
    mensaje: String
    almuerzo: Almuerzo
  }

  type AvisoPayload {
    ok: Boolean!
    mensaje: String
    almuerzo: Almuerzo
    almuerzosRestantes: Int
  }

  type PensionPorPersona {
    personaId: ID!
    ok: Boolean!
    mensaje: String!
    diasConfirmados: Int!
    totalBs: Int!
  }

  type PensionPayload {
    ok: Boolean!
    mensaje: String
    resultados: [PensionPorPersona!]!
  }

  type FeriadoPayload {
    ok: Boolean!
    mensaje: String
    feriado: Feriado
  }

  type Mutation {
    "HU01. No requiere sesión."
    iniciarSesion(usuario: String!, contrasena: String!): SesionPayload!
    cerrarSesion: Boolean!
    "HU02 y HU06. Sin personaId, reserva para quien inició sesión."
    reservarAlmuerzo(fecha: String!, personaId: ID): AlmuerzoPayload!
    "HU03 y HU06 CA5."
    cancelarReserva(fecha: String!, personaId: ID): AlmuerzoPayload!
    "HU08 y HU09. Una pensión por persona."
    pensionar(anio: Int!, mes: Int!, personaIds: [ID!]!): PensionPayload!
    "HU10."
    avisarInasistencia(fecha: String!, personaId: ID): AvisoPayload!
    "HU07. Solo encargado."
    registrarFeriado(fecha: String!, descripcion: String!): FeriadoPayload!
  }
`;
