export interface User {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: string;
  organization: string;
  location: string;
  verified: boolean;
  verificationBasis: string;
  groupNumber: string;
  pwSalt: string;
  pwHash: string;
  token?: string;
}

export type PublicUser = Omit<User, "pwSalt" | "pwHash" | "token">;

export interface Price {
  name: string;
  price: number;
  source: string;
  image: string;
}

export interface Lot {
  id: string;
  name: string;
  type: string;
  price: number;
  coret: number | null;
  weight: number;
  seller: string;
  location: string;
  time: string;
  createdAt: string;
  size: string;
  image: string;
  rating: number;
  sold: number;
  promo: string | null;
}

export interface Order {
  id: string;
  lotId: string;
  buyerUserId: string;
  buyer: string;
  quantity: number;
  status: "Baru" | "Diterima" | "Ditolak" | string;
  createdAt: string;
}

export interface OrderView extends Order {
  product: string;
  seller: string;
}

export interface Database {
  users: User[];
  prices: Price[];
  lots: Lot[];
  orders: Order[];
}

export interface RegisterInput {
  name?: string;
  role?: string;
  organization?: string;
  location?: string;
  email?: string;
  password?: string;
}
