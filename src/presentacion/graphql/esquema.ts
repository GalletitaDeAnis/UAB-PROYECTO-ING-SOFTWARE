/**
 * Contrato GraphQL del restaurante. Es lo que consume un frontend aparte.
 * Fechas: texto "AAAA-MM-DD", hora de Bolivia. Montos: bolivianos enteros.
 * La guía con ejemplos está en entregables/api-graphql.md.
 */
export const esquema = /* GraphQL */ `
  enum TipoUsuario {
    ADMINISTRADOR
    EMPLEADO
  }

  enum TipoPersona {
    EMPLEADO
    FAMILIAR
  }

  enum Parentesco {
    CONYUGE
    HIJO
    HIJA
    PADRE
    MADRE
  }

  enum Modalidad {
    NO_PENSIONADO
    PENSIONADO
  }

  enum EstadoReserva {
    CONFIRMADA
    CANCELADA
    INASISTENCIA_AVISADA
  }

  enum FormatoReporte {
    EXCEL
    PDF
  }

  "Quien consume: un usuario (su propio titular) o un familiar de primer grado."
  type Persona {
    id: ID!
    tipo: TipoPersona!
    nombres: String!
    apellidos: String!
    nombreCompleto: String!
    ci: String!
    fechaNacimiento: String!
    telefono: String!
    parentesco: Parentesco
    titularId: ID!
    activo: Boolean!
  }

  type Usuario {
    id: ID!
    nombreUsuario: String!
    tipo: TipoUsuario!
    "HU02 CA6: mientras sea true, solo se acepta cambiarContrasena."
    debeCambiarContrasena: Boolean!
  }

  type Cuenta {
    codigoEmpleado: String!
    nombreUsuario: String!
    tipo: TipoUsuario!
    debeCambiarContrasena: Boolean!
  }

  type FichaUsuario {
    persona: Persona!
    cuenta: Cuenta!
    familiares: [Persona!]!
    topeDiario: Int!
  }

  type MiFamilia {
    titular: Persona!
    familiares: [Persona!]!
    "R14: 1 + familiares activos."
    topeDiario: Int!
  }

  type DiaDelMenu {
    fecha: String!
    "null: sin atención (si la semana está publicada) o menú pendiente."
    descripcion: String
  }

  type MenuSemanal {
    lunes: String!
    publicado: Boolean!
    publicadoEl: String
    dias: [DiaDelMenu!]!
  }

  type Reserva {
    personaId: ID!
    "Solo viene en misReservas."
    nombrePersona: String
    titularId: ID!
    fecha: String!
    modalidad: Modalidad!
    precioBs: Int!
    estado: EstadoReserva!
  }

  type FilaDelDia {
    personaId: ID!
    nombre: String!
    tipoPersona: TipoPersona!
    parentesco: Parentesco
    titularId: ID!
    nombreTitular: String!
    modalidad: Modalidad!
  }

  type ListaDelDia {
    fecha: String!
    sinAtencion: Boolean!
    menu: String
    total: Int!
    filas: [FilaDelDia!]!
  }

  type LineaDescuento {
    personaId: ID!
    nombreCompleto: String!
    tipo: TipoPersona!
    parentesco: Parentesco
    modalidad: Modalidad!
    cantidad: Int!
    precioUnitarioBs: Int!
    subtotalBs: Int!
  }

  type DescuentoTitular {
    titularId: ID!
    nombreTitular: String!
    codigoEmpleado: String!
    lineas: [LineaDescuento!]!
    totalBs: Int!
  }

  type ReporteMensual {
    anio: Int!
    mes: Int!
    titulares: [DescuentoTitular!]!
    totalBs: Int!
    "GET con el mismo token devuelve el archivo (HU10 CA3)."
    urlExcel: String!
    urlPdf: String!
  }

  type ConsumoPersona {
    persona: Persona!
    pensionado: Boolean!
    lineas: [LineaDescuento!]!
    cantidad: Int!
    subtotalBs: Int!
    programados: Int
    minimo: Int
    "Solo para pensionados (HU11 CA2)."
    inasistenciasDisponibles: Int
  }

  type MiConsumo {
    anio: Int!
    mes: Int!
    personas: [ConsumoPersona!]!
    totalBs: Int!
    diasSinAtencion: [String!]!
  }

  type Hoy {
    "Fecha actual en America/La_Paz."
    fecha: String!
    horaLimite: String!
    "Lunes de esta semana, para pedir el menú."
    lunes: String!
  }

  type Query {
    "No requiere sesión."
    hoy: Hoy!
    yo: Usuario!
    menuSemanal(lunes: String!): MenuSemanal!
    "Solo empleado."
    miFamilia: MiFamilia!
    misReservas(anio: Int!, mes: Int!): [Reserva!]!
    miConsumo(anio: Int!, mes: Int!): MiConsumo!
    "Solo administrador."
    usuarios: [FichaUsuario!]!
    usuario(id: ID!): FichaUsuario!
    "Solo administrador. Sin fecha, es hoy."
    listaDelDia(fecha: String): ListaDelDia!
    reporteMensual(anio: Int!, mes: Int!): ReporteMensual!
  }

  type SesionPayload {
    ok: Boolean!
    mensaje: String
    "Va en cada pedido siguiente como Authorization: Bearer <token>."
    token: String
    usuario: Usuario
    persona: Persona
    minutosDeInactividad: Int!
  }

  type UsuarioPayload {
    ok: Boolean!
    mensaje: String
    usuario: Usuario
  }

  type ResultadoPorPersona {
    personaId: ID!
    nombre: String!
    ok: Boolean!
    mensaje: String!
  }

  type VariasPersonasPayload {
    ok: Boolean!
    mensaje: String
    resultados: [ResultadoPorPersona!]!
  }

  type ReservaPayload {
    ok: Boolean!
    mensaje: String
    reserva: Reserva
  }

  type AvisoPayload {
    ok: Boolean!
    mensaje: String
    reserva: Reserva
    programadosRestantes: Int
    minimo: Int
  }

  type MenuPayload {
    ok: Boolean!
    mensaje: String
    menu: MenuSemanal
    reservasDePension: Int
  }

  type FichaPayload {
    ok: Boolean!
    mensaje: String
    ficha: FichaUsuario
  }

  type PersonaPayload {
    ok: Boolean!
    mensaje: String
    persona: Persona
  }

  type BajaPayload {
    ok: Boolean!
    mensaje: String
    personas: [Persona!]
    reservasAnuladasDesde: String
  }

  type ContrasenaTemporalPayload {
    ok: Boolean!
    mensaje: String
    "Se muestra una sola vez."
    temporal: String
  }

  input DatosPersonalesInput {
    nombres: String!
    apellidos: String!
    ci: String!
    fechaNacimiento: String!
    telefono: String!
  }

  input FamiliarInput {
    nombres: String!
    apellidos: String!
    ci: String!
    fechaNacimiento: String!
    telefono: String!
    parentesco: Parentesco!
  }

  input RegistroInput {
    datos: DatosPersonalesInput!
    codigoEmpleado: String!
    nombreUsuario: String!
    contrasenaInicial: String!
    tipo: TipoUsuario!
    familiares: [FamiliarInput!]
  }

  input DiaDelMenuInput {
    fecha: String!
    descripcion: String!
  }

  type Mutation {
    "HU02. No requiere sesión."
    iniciarSesion(usuario: String!, contrasena: String!): SesionPayload!
    cerrarSesion: Boolean!
    "HU02 CA6."
    cambiarContrasena(actual: String!, nueva: String!, confirmacion: String!): UsuarioPayload!
    "HU01."
    registrarUsuario(registro: RegistroInput!): FichaPayload!
    "HU03."
    publicarMenu(lunes: String!, dias: [DiaDelMenuInput!]!): MenuPayload!
    "HU04. Sin personaIds, reserva para quien inició sesión."
    reservarAlmuerzo(fecha: String!, personaIds: [ID!]): VariasPersonasPayload!
    "HU05."
    cancelarReserva(fecha: String!, personaId: ID): ReservaPayload!
    "HU07. Una pensión por persona, solo para el mes siguiente."
    pensionar(anio: Int!, mes: Int!, personaIds: [ID!]!): VariasPersonasPayload!
    "HU08."
    avisarInasistencia(fecha: String!, personaId: ID): AvisoPayload!
    "HU09."
    agregarFamiliar(titularId: ID!, familiar: FamiliarInput!): PersonaPayload!
    modificarDatos(personaId: ID!, datos: DatosPersonalesInput!, parentesco: Parentesco): PersonaPayload!
    cambiarTipoUsuario(personaId: ID!, tipo: TipoUsuario!): FichaPayload!
    darDeBaja(personaId: ID!): BajaPayload!
    restablecerContrasena(personaId: ID!): ContrasenaTemporalPayload!
  }
`;
