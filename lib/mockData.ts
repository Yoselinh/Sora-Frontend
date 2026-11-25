import {
  PrendaBase,
  Tela,
  Taller,
  Diseno,
  SolicitudCotizacion,
  Cotizacion,
  Usuario
} from "@/types";

export const MOCK_USUARIOS: Usuario[] = [
  { id: 1, nombre: "Valeria Mendoza", email: "valeria@gmail.com", rol: "cliente", fechaCreacion: "2026-01-10T10:00:00Z" },
  { id: 2, nombre: "Confecciones Andinas S.A.C.", email: "contacto@andinas.pe", rol: "taller", fechaCreacion: "2026-01-15T10:00:00Z" },
  { id: 3, nombre: "Textiles Gamarra Express", email: "ventas@gamarraexpress.pe", rol: "taller", fechaCreacion: "2026-02-01T10:00:00Z" },
  { id: 4, nombre: "Taller Hermanos Castro", email: "castro@taller.pe", rol: "taller", fechaCreacion: "2026-02-12T10:00:00Z" },
  { id: 5, nombre: "Administrador Central", email: "admin@sora.pe", rol: "admin", fechaCreacion: "2026-01-01T10:00:00Z" },
];

export const MOCK_TELAS: Tela[] = [
  { id: 1, nombre: "Algodón Pima 50/1", composicion: "100% Algodón Peruano Peinado" },
  { id: 2, nombre: "Franela Reactiva Pesada", composicion: "80% Algodón, 20% Poliéster" },
  { id: 3, nombre: "Lino Rústico Premium", composicion: "100% Lino Natural" },
  { id: 4, nombre: "Denim Raw 12.5 oz", composicion: "98% Algodón, 2% Elastano" },
  { id: 5, nombre: "Rib Algodón 2x1", composicion: "95% Algodón, 5% Spandex" },
  { id: 6, nombre: "Poliéster Dry-Fit Deportivo", composicion: "100% Microfibra Transpirable" },
];

export const MOCK_PRENDAS_BASE: PrendaBase[] = [
  {
    id: 1,
    nombre: "Polo Boxy Fit Oversize",
    categoria: "Polos & Tops",
    descripcion: "Corte cuadrado contemporáneo con hombros caídos y cuello alto cerrado.",
    modelo3dUrl: "/models/polo-boxy.glb"
  },
  {
    id: 2,
    nombre: "Hoodie Canguro Pesado",
    categoria: "Poleras & Abrigos",
    descripcion: "Sudadera con capucha reforzada, bolsillo canguro y acabados en rib pesado.",
    modelo3dUrl: "/models/hoodie.glb"
  },
  {
    id: 3,
    nombre: "Camisa Resort Manga Corta",
    categoria: "Camisas",
    descripcion: "Camisa relajada de cuello cubano camp y corte recto de verano.",
    modelo3dUrl: "/models/camisa-resort.glb"
  },
  {
    id: 4,
    nombre: "Pantalón Cargo Táctico",
    categoria: "Pantalones",
    descripcion: "Pantalón urbano con bolsillos laterales fuelles y pretina elastizada.",
    modelo3dUrl: "/models/cargo.glb"
  }
];

export const MOCK_TALLERES: Taller[] = [
  {
    id: 1,
    usuarioId: 2,
    nombre: "Confecciones Andinas S.A.C.",
    direccion: "Jr. Gamarra 840, Galería Industrial Int. 402, La Victoria, Lima",
    telefono: "+51 987 654 321",
    tallerTelas: [
      { tallerId: 1, telaId: 1, precioPorMetro: 14.50, tela: MOCK_TELAS[0] },
      { tallerId: 1, telaId: 2, precioPorMetro: 22.00, tela: MOCK_TELAS[1] },
      { tallerId: 1, telaId: 5, precioPorMetro: 11.00, tela: MOCK_TELAS[4] }
    ]
  },
  {
    id: 2,
    usuarioId: 3,
    nombre: "Textiles Gamarra Express",
    direccion: "Av. Aviación 1250, Piso 3, Lima",
    telefono: "+51 912 345 678",
    tallerTelas: [
      { tallerId: 2, telaId: 1, precioPorMetro: 13.80, tela: MOCK_TELAS[0] },
      { tallerId: 2, telaId: 3, precioPorMetro: 28.50, tela: MOCK_TELAS[2] },
      { tallerId: 2, telaId: 6, precioPorMetro: 16.00, tela: MOCK_TELAS[5] }
    ]
  },
  {
    id: 3,
    usuarioId: 4,
    nombre: "Taller Hermanos Castro",
    direccion: "Calle Los Confeccionistas 210, San Juan de Lurigancho, Lima",
    telefono: "+51 976 543 210",
    tallerTelas: [
      { tallerId: 3, telaId: 2, precioPorMetro: 20.00, tela: MOCK_TELAS[1] },
      { tallerId: 3, telaId: 4, precioPorMetro: 24.00, tela: MOCK_TELAS[3] }
    ]
  }
];

export const MOCK_DISENOS: Diseno[] = [
  {
    id: 1,
    clienteId: 1,
    prendaBaseId: 1,
    nombre: "Polo Minimalista Off-White",
    configuracionVisor: JSON.stringify({ colorCuerpo: "#f4ecdd", colorMangas: "#f4ecdd", colorCuello: "#4a2f21" }),
    fechaCreacion: "2026-03-01T15:30:00Z",
    prendaBase: MOCK_PRENDAS_BASE[0],
    disenoTelas: [
      { id: 1, disenoId: 1, telaId: 1, parte: "Cuerpo", tela: MOCK_TELAS[0] },
      { id: 2, disenoId: 1, telaId: 1, parte: "Mangas", tela: MOCK_TELAS[0] },
      { id: 3, disenoId: 1, telaId: 5, parte: "Cuello Rib", tela: MOCK_TELAS[4] }
    ]
  },
  {
    id: 2,
    clienteId: 1,
    prendaBaseId: 2,
    nombre: "Hoodie Terra Bicolor",
    configuracionVisor: JSON.stringify({ colorCuerpo: "#c2603f", colorMangas: "#4a2f21", colorCuello: "#c2603f" }),
    fechaCreacion: "2026-03-05T18:00:00Z",
    prendaBase: MOCK_PRENDAS_BASE[1],
    disenoTelas: [
      { id: 4, disenoId: 2, telaId: 2, parte: "Cuerpo y Capucha", tela: MOCK_TELAS[1] },
      { id: 5, disenoId: 2, telaId: 2, parte: "Mangas", tela: MOCK_TELAS[1] },
      { id: 6, disenoId: 2, telaId: 5, parte: "Pretina y Puños", tela: MOCK_TELAS[4] }
    ]
  }
];

export const MOCK_SOLICITUDES: SolicitudCotizacion[] = [
  {
    id: 101,
    clienteId: 1,
    disenoId: 1,
    estado: "Cotizado",
    fecha: "2026-03-10T14:20:00Z",
    cliente: MOCK_USUARIOS[0],
    diseno: MOCK_DISENOS[0],
    solicitudTallas: [
      { id: 1, solicitudId: 101, talla: "S", cantidad: 30 },
      { id: 2, solicitudId: 101, talla: "M", cantidad: 60 },
      { id: 3, solicitudId: 101, talla: "L", cantidad: 40 },
      { id: 4, solicitudId: 101, talla: "XL", cantidad: 20 },
    ],
    cotizaciones: [
      {
        id: 201,
        solicitudId: 101,
        tallerId: 1,
        precioUnitario: 32.50,
        total: 4875.00,
        plazoDias: 15,
        estado: "Pendiente",
        fecha: "2026-03-11T10:00:00Z",
        taller: MOCK_TALLERES[0]
      },
      {
        id: 202,
        solicitudId: 101,
        tallerId: 2,
        precioUnitario: 31.00,
        total: 4650.00,
        plazoDias: 18,
        estado: "Pendiente",
        fecha: "2026-03-11T12:30:00Z",
        taller: MOCK_TALLERES[1]
      }
    ]
  },
  {
    id: 102,
    clienteId: 1,
    disenoId: 2,
    estado: "En confección",
    fecha: "2026-03-02T11:00:00Z",
    cliente: MOCK_USUARIOS[0],
    diseno: MOCK_DISENOS[1],
    solicitudTallas: [
      { id: 5, solicitudId: 102, talla: "M", cantidad: 50 },
      { id: 6, solicitudId: 102, talla: "L", cantidad: 50 },
    ],
    cotizaciones: [
      {
        id: 203,
        solicitudId: 102,
        tallerId: 1,
        precioUnitario: 78.00,
        total: 7800.00,
        plazoDias: 20,
        estado: "Aceptada",
        fecha: "2026-03-03T16:00:00Z",
        taller: MOCK_TALLERES[0]
      }
    ]
  }
];
