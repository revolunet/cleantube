export type Tag =
  | "scolaire"
  | "elementaire"
  | "college"
  | "lycee"
  | "orientation"
  | "metiers"
  | "mathematiques"
  | "sciences"
  | "francais"
  | "anglais"
  | "espagnol"
  | "langues"
  | "histoire"
  | "geographie"
  | "physique"
  | "chimie"
  | "biologie"
  | "economie"
  | "arts"
  | "musique"
  | "litterature"
  | "philosophie"
  | "informatique"
  | "technologie"
  | "sport"
  | "environnement";

export type AgeGroup =
  | "tout public"
  | "3-5 ans"
  | "5-10 ans"
  | "10-15 ans"
  | "15 ans et plus"
  | "adultes";

export type Language = "fr" | "en" | "es" | "de" | "it" | "pt" | "other";

export interface Video {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  published_at?: string;
  thumbnail?: string;
  tags?: Tag[];
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  public: AgeGroup;
  language?: Language;
  tags: Tag[];
  videos?: Video[];
}
