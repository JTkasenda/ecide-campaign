/**
 * Textes d'interface : le site est rédigé en français ; pour les autres langues,
 * l'API fournit un dictionnaire « phrase française → traduction » (lang/*.json
 * de Laravel + corrections de l'administration). t() renvoie la traduction ou
 * la phrase source, et remplace les paramètres :nom.
 * Module sans dépendance à React : utilisable côté serveur comme côté client.
 */
export type Strings = Record<string, string>;

export type T = (source: string, params?: Record<string, string | number>) => string;

export function makeT(strings: Strings): T {
  return (source, params) => {
    let out = strings[source] ?? source;
    if (params) {
      // Les clés les plus longues d'abord : « :pages » avant « :page »
      const keys = Object.keys(params).sort((a, b) => b.length - a.length);
      for (const k of keys) out = out.split(`:${k}`).join(String(params[k]));
    }
    return out;
  };
}
