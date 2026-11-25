// types/index.ts
// Tipos TypeScript generados a partir del swagger.json oficial de Sora API.

export type Rol = "cliente" | "taller" | "admin";

// ─── AUTH & USUARIOS ─────────────────────────────────────────────────────────

export interface LoginCommand {
  email: string;
  password: string;
}

export interface AddUsuarioCommand {
  nombre: string;
  email: string;
  password: string;
  rol: string;
}

export interface UpdateUsuarioCommand {
  id: number;
  nombre?: string;
  email?: string;
  rol?: string;
}

export interface Role {
  id: number;
  nombre?: string;
  usuarios?: Usuario[] | null;
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  passwordHash?: string;
  rolId?: number;
  fechaCreacion?: string;
  disenos?: Diseno[] | null;
  rol?: Role | string | null;
  solicitudesCotizacions?: SolicitudesCotizacion[] | null;
  tallere?: Tallere | null;
}

// ─── PRENDAS BASE ───────────────────────────────────────────────────────────

export interface AddPrendaBaseCommand {
  nombre?: string;
  categoria?: string;
  descripcion?: string;
  modelo3dUrl?: string;
}

export interface UpdatePrendaBaseCommand {
  id: number;
  nombre?: string;
  categoria?: string;
  descripcion?: string;
  modelo3dUrl?: string;
}

// Aliases de compatibilidad
export type CreatePrendaBaseRequestDto = AddPrendaBaseCommand;
export type UpdatePrendaBaseRequestDto = UpdatePrendaBaseCommand;

export interface PrendasBase {
  id: number;
  nombre: string;
  categoria?: string;
  descripcion?: string;
  modelo3dUrl?: string;
  disenos?: Diseno[] | null;
}

// Alias de conveniencia
export type PrendaBase = PrendasBase;

// ─── TELAS ──────────────────────────────────────────────────────────────────

export interface AddTelaCommand {
  nombre?: string;
  composicion?: string;
}

export interface UpdateTelaCommand {
  id: number;
  nombre?: string;
  composicion?: string;
}

// Aliases de compatibilidad
export type CreateTelaRequestDto = AddTelaCommand;
export type UpdateTelaRequestDto = UpdateTelaCommand;

export interface Tela {
  id: number;
  nombre: string;
  composicion?: string;
  disenoTelas?: DisenoTela[] | null;
  tallerTelas?: TallerTela[] | null;
}

// ─── TALLERES & TALLER-TELAS ────────────────────────────────────────────────

export interface AddTallerCommand {
  usuarioId: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
}

export interface UpdateTallerCommand {
  id: number;
  nombre?: string;
  direccion?: string;
  telefono?: string;
}

export interface AddTallerTelaCommand {
  tallerId: number;
  telaId: number;
  precioPorMetro: number;
}

export interface UpdateTallerTelaCommand {
  tallerId: number;
  telaId: number;
  precioPorMetro: number;
}

export interface TallerTela {
  tallerId: number;
  telaId: number;
  precioPorMetro: number;
  taller?: Tallere | null;
  tela?: Tela | null;
}

export interface Tallere {
  id: number;
  usuarioId: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
  cotizaciones?: Cotizacione[] | null;
  tallerTelas?: TallerTela[] | null;
  usuario?: Usuario | null;
}

// Alias de conveniencia
export type Taller = Tallere;

// ─── DISEÑOS & DISEÑO-TELAS ─────────────────────────────────────────────────

export interface AddDisenoCommand {
  clienteId: number;
  prendaBaseId: number;
  nombre: string;
  configuracionVisor?: string;
}

export interface UpdateDisenoCommand {
  id: number;
  clienteId: number;
  prendaBaseId: number;
  nombre?: string;
  configuracionVisor?: string;
}

export interface AddDisenoTelaCommand {
  disenoId: number;
  telaId: number;
  parte?: string;
}

export interface UpdateDisenoTelaCommand {
  id: number;
  disenoId: number;
  telaId: number;
  parte?: string;
}

export interface DisenoTela {
  id: number;
  disenoId: number;
  telaId: number;
  parte?: string;
  diseno?: Diseno | null;
  tela?: Tela | null;
}

export interface Diseno {
  id: number;
  clienteId: number;
  prendaBaseId: number;
  nombre: string;
  configuracionVisor?: string;
  fechaCreacion?: string;
  cliente?: Usuario | null;
  disenoTelas?: DisenoTela[] | null;
  prendaBase?: PrendasBase | null;
  solicitudesCotizacions?: SolicitudesCotizacion[] | null;
}

// ─── SOLICITUDES DE COTIZACIÓN & TALLAS ─────────────────────────────────────

export interface AddSolicitudCotizacionCommand {
  clienteId: number;
  disenoId: number;
}

export interface UpdateSolicitudCotizacionCommand {
  id: number;
  estado?: string;
}

export interface AddSolicitudTallaCommand {
  solicitudId: number;
  talla?: string;
  cantidad?: number;
}

export interface UpdateSolicitudTallaCommand {
  id: number;
  talla?: string;
  cantidad?: number;
}

export interface SolicitudTalla {
  id: number;
  solicitudId: number;
  talla: string;
  cantidad: number;
  solicitud?: SolicitudesCotizacion | null;
}

export interface SolicitudesCotizacion {
  id: number;
  disenoId: number;
  clienteId: number;
  estado?: string;
  fecha?: string;
  cliente?: Usuario | null;
  cotizaciones?: Cotizacione[] | null;
  diseno?: Diseno | null;
  solicitudTallas?: SolicitudTalla[] | null;
}

// Alias de conveniencia
export type SolicitudCotizacion = SolicitudesCotizacion;

// ─── COTIZACIONES ───────────────────────────────────────────────────────────

export interface AddCotizacionCommand {
  solicitudId: number;
  tallerId: number;
  precioUnitario: number;
  total: number;
  plazoDias: number;
  estado?: string;
}

export interface UpdateCotizacionCommand {
  id: number;
  solicitudId: number;
  tallerId: number;
  precioUnitario: number;
  total: number;
  plazoDias: number;
  estado?: string;
}

// Aliases de compatibilidad
export type CreateCotizacionRequestDto = AddCotizacionCommand;
export type UpdateCotizacionRequestDto = UpdateCotizacionCommand;

export interface Cotizacione {
  id: number;
  solicitudId: number;
  tallerId: number;
  precioUnitario: number;
  total: number;
  plazoDias: number;
  estado?: string;
  fecha?: string;
  solicitud?: SolicitudesCotizacion | null;
  taller?: Tallere | null;
}

// Alias de conveniencia
export type Cotizacion = Cotizacione;
