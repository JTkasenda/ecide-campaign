/* Formes des réponses de l'API Laravel (routes/api.php, App\Http\Controllers\Api\ContentController). */

export type Tone = "blue" | "yellow" | "green";
export type Couleur = "bleu" | "jaune" | "vert";

export interface Language {
  code: string;
  nom: string;
  defaut: boolean;
}

export interface NavItem {
  id: string;
  libelle: string;
  url: string;
  key: string;
  /** Page secondaire (sous « Le Parti ») : organigramme, charte des valeurs, projet de société. */
  sub?: boolean;
}

export interface Social {
  key: string;
  url: string;
  label: string;
  icon: string;
  handle: string;
}

export interface TickerItem {
  tag: string;
  tone: Tone;
  texte: string;
  date: string;
  dateLabel: string;
  url: string;
}

export interface SiteParams {
  nom?: string;
  /** Emblème téléversé dans l'administration (Paramètres › Identité) ; l'API le sert dans assets */
  logo?: string;
  slogan?: string;
  nomLong?: string;
  description?: string;
  bleu?: string;
  jaune?: string;
  vert?: string;
  adresse?: string;
  email?: string;
  telephone?: string;
  whatsapp?: string;
  presse?: string;
  don?: string;
  carte?: string;
  x?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  whatsappCanal?: string;
  filsAccueil: boolean;
  cta?: string;
  ctaUrl: string;
  footerTexte?: string;
  footerCombats: string[];
  copyright?: string;
  newsletter: boolean;
  domaine?: string;
  /** Tailles des textes en % (réglage de l'administration, 70–150) : générale puis par famille. */
  texteTaille: number;
  tailleTitres: number;
  tailleSousTitres: number;
  tailleSurtitres: number;
  tailleParagraphes: number;
  tailleBoutons: number;
  tailleEntete: number;
  taillePied: number;
  tailleFil: number;
}

export interface Site {
  locale: string;
  defaultLocale: string;
  languages: Language[];
  params: SiteParams;
  nav: NavItem[];
  cta: { label: string; url: string };
  socials: Social[];
  ticker: { items: TickerItem[]; vitesse: string; autresPages: boolean };
  assets: { logo: string; logo512: string; favicon: string; social: string };
  admin: string;
  translation: { provider: string; automatic: boolean };
}

export interface Category {
  key: string;
  label: string;
  long: string;
  tag: string;
  text: string;
  bg: string;
  muted: string;
  icon: string;
  tone: Tone;
}

export interface NewsItem {
  id: string;
  slug: string;
  url: string;
  titre: string;
  resume: string;
  categorie: Category;
  date: string;
  dateLabel: string;
  auteur: string;
  lecture: string;
  image: string;
  legende: string;
  video: string;
  youtubeId: string | null;
  /** Lecteur intégré (YouTube, Facebook, Vimeo, Dailymotion ou fichier), ou null */
  embed: VideoEmbed | null;
  /** Lien pour regarder la vidéo sur sa plateforme (YouTube…), ou vide */
  lienVideo: string;
  plateforme: Plateforme | null;
  duree: string;
  alaune: boolean;
  contenu?: string;
  seoTitre?: string;
  seoDesc?: string;
}

export type Plateforme = "youtube" | "facebook" | "vimeo" | "dailymotion";

export interface VideoEmbed {
  provider: "youtube" | "facebook" | "vimeo" | "dailymotion" | "file";
  src: string;
}

export interface Video {
  id: string;
  titre: string;
  url: string;
  type: string;
  typeLabel: string;
  lieu: string;
  date: string;
  dateLabel: string;
  duree: string;
  youtubeId: string | null;
  embed: VideoEmbed | null;
  lien: string;
  plateforme: Plateforme | null;
}

export interface HomePage {
  hero: { titre: string; slogan: string; texte: string; image: string; cadrage: number; voile: number; tailleTitre: number; tailleSlogan: number; tailleTexte: number; tailleChiffres: number; tailleChiffresLibelle: number };
  chiffres: { valeur: string; libelle: string; couleur: Couleur }[];
  manifeste: { surtitre: string; texte: string; lien1: string; url1: string; lien2: string; url2: string; tailleSurtitre: number; tailleTexte: number; tailleLiens: number };
  combats: { titre: string; texte: string; lien: string; url: string; icone: string; couleur: Couleur }[];
  positions: { titre: string; texte: string; court: string; ton: string }[];
  sections: Record<string, string | number | boolean | undefined> & {
    positionsUrl: string;
    presidentUrl1: string;
    presidentUrl2: string;
    presidentSuivre: boolean;
    actuNombre: number;
  };
  president: { nom: string; portrait: string; x: string; facebook: string };
  news: { featured: NewsItem | null; latest: NewsItem[] };
  fils: { actif: boolean; x: string; facebook: string };
  proximite: { provinces: string[]; pays: { nom: string; continent: string }[] };
  agir: { titre: string; texte: string; bouton: string; url: string; icone: string; couleur: Couleur }[];
  seo: { description: string; image: string };
  jsonld: Record<string, unknown>;
}

/** Document PDF publié dans l'administration (charte des valeurs, projet de société, textes fondateurs). */
export interface PartyDocument {
  url: string;
  taille: string;
  date: string;
  dateLabel: string;
}

export interface PartiPage {
  parti: Record<string, string>;
  page: Record<string, string>;
  chiffres: { valeur: string; libelle: string; source: string }[];
  engagements: string[];
  missions: string[];
  projetAxes: { titre: string; texte: string; icone: string }[];
  valeurs: { titre: string; texte: string; icone: string; couleur: Couleur }[];
  etapes: { repere: string; titre: string; texte: string }[];
  organes: { titre: string; texte: string; icone: string; niveau?: "national" | "provincial" | "affilie" }[];
  membres: { titre: string; texte: string; icone: string; couleur: Couleur }[];
  documents: ({ nom: string } & PartyDocument)[];
  charte: PartyDocument | null;
  projet: PartyDocument | null;
}

export interface PresidentPage {
  president: Record<string, string> & { afficherFils: boolean };
  /** Biographie officielle (PDF téléversé dans l'administration), null sans fichier. */
  biographie: PartyDocument | null;
  enBref: { label: string; valeur: string }[];
  parcours: { repere: string; titre: string; texte: string }[];
  videos: Video[];
  presse: { nom: string; type: string; taille: string; date: string; dateLabel: string; url: string }[];
}

export interface ActualitesPage {
  page: Record<string, string>;
  edition: { date: string; dateLabel: string };
  categories: { key: string; label: string; long: string }[];
  featured: NewsItem | null;
  side: NewsItem[];
  news: NewsItem[];
  video: Video | null;
  positions: { titre: string; texte: string }[];
  socials: Social[];
  newsletter: boolean;
}

export interface Article {
  article: NewsItem & { contenu: string };
  related: NewsItem[];
}

export interface Reseaux {
  x?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
}

export interface Cadre {
  id: string;
  nom: string;
  fonction: string;
  organe: string;
  organeLabel: string;
  categorie: string;
  niveau: string;
  province: string;
  ville: string;
  commune: string;
  /** Quartier, avenue ou rue (cellule, place de résistance) */
  quartier: string;
  photo: string;
  reseaux: Reseaux | null;
}

export interface StructureContact {
  organe: string;
  type?: string;
  province?: string;
  pays?: string;
  ville?: string;
  email?: string;
  telephone?: string;
  whatsapp?: string;
  adresse?: string;
  permanence?: string;
  canal?: string;
  via?: string;
  quartier?: string;
}

export interface CadresData {
  /** Présentation en tête de page (Autres pages › Cadres) */
  page: Record<string, string>;
  /** Chiffres calculés par l'API */
  stats: { nationaux: number; spe: number; sections: number; cellules: number; places: number };
  cadres: Cadre[];
  provinces: string[];
  communes: Record<string, string[]>;
  contacts: Record<string, StructureContact>;
  organes: Record<string, string>;
  contactUrl: string;
}

export interface DiasporaEntry {
  id: string;
  nom: string;
  fonction: string;
  organe: string;
  organeLabel: string;
  continent: string;
  pays: string;
  ville: string;
  reseaux: Reseaux | null;
}

export interface Continent {
  id: string;
  label: string;
  icon: string;
  color: Tone;
  hint: string;
}

export interface DiasporaData {
  continents: Continent[];
  entries: DiasporaEntry[];
  contacts: Record<string, StructureContact>;
  organes: Record<string, string>;
  contactUrl: string;
}

export interface DiasporaPage {
  page: Record<string, string | string[]> & { avantages: string[]; choix: string[]; confirmation: string };
  data: DiasporaData;
}

export interface ContactPage {
  page: Record<string, string> & { confirmation: string };
  params: { nom?: string; adresse?: string; email?: string; telephone?: string; presse?: string; carte?: string; whatsapp?: string };
  whatsapp: string;
  destinataires: string[];
}

export interface PaymentMethod {
  key: string;
  label: string;
  court: string;
  lines: string[];
  note?: string;
  /** Icône Font Awesome du moyen (carte, téléphone, PayPal) */
  icone?: string;
  /** Marques affichées sur la puce : visa, mastercard, airtel, orange, mpesa, afrimoney, paypal */
  marques?: string[];
  /** Page de paiement sécurisée du prestataire (carte bancaire), ou vide */
  url?: string;
}

export interface AdhererPage {
  page: Record<string, unknown> & { etapes: { titre: string; texte: string }[]; plateformeUrl: string; espaceUrl: string };
  atouts: { titre: string; texte: string; icone: string; couleur: Couleur }[];
  faq: { question: string; reponse: string }[];
  paiement: {
    deviseDefaut: "cdf" | "usd";
    cdf: { amounts: number[]; min: number };
    usd: { amounts: number[]; min: number };
    moyens: PaymentMethod[];
  };
}

export interface MentionsPage {
  mentions: string;
  paragraphs: string[];
  params: { nom?: string; nomLong?: string; adresse?: string; email?: string; telephone?: string };
}

export interface I18n {
  locale: string;
  strings: Record<string, string>;
}
