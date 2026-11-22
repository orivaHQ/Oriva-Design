export type DesignKind = 'ui' | 'logo';
export type MemberRole = 'editor' | 'viewer';

export interface DesignRecord {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  design_type: DesignKind;
  data: DesignData;
  is_public: boolean;
  share_token: string;
  created_at: string;
  updated_at: string;
}

export interface CanvasLayer {
  id: string;
  kind: 'text' | 'button' | 'card' | 'circle' | 'image' | 'line';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fill: string;
  color: string;
  fontSize: number;
  radius: number;
  opacity: number;
}

export interface LogoData {
  brandName: string;
  tagline: string;
  symbol: 'orbit' | 'bloom' | 'monogram' | 'diamond';
  primary: string;
  accent: string;
  background: string;
  foreground: string;
  font: 'Manrope' | 'DM Sans' | 'Georgia';
  weight: number;
  tracking: number;
  radius: number;
  layout: 'horizontal' | 'stacked';
  showTagline: boolean;
}

export interface DesignData {
  version: 1;
  layers?: CanvasLayer[];
  logo?: LogoData;
  frame?: { width: number; height: number; color: string };
}

export interface MemberRecord {
  user_id: string;
  role: MemberRole;
  invited_email?: string;
  added_at: string;
}

export interface CommentRecord {
  id: string;
  design_id: string;
  author_id: string;
  body: string;
  created_at: string;
}
