/**
 * Formas cada vez más específicas para desambiguar nombres españoles.
 * Pablo Ruiz Jurado → ["Pablo R.", "Pablo R.J.", "Pablo Ruiz", "Pablo Ruiz J.", completo]
 */
function nameForms(fullName) {
  const n = String(fullName || "").trim();
  if (!n) return [""];
  const p = n.split(/\s+/);
  if (p.length === 1) {
    return p[0].length > 14 ? [`${p[0].slice(0, 13)}…`, p[0]] : [p[0]];
  }
  const forms = [`${p[0]} ${p[1].charAt(0)}.`];
  if (p[2]) forms.push(`${p[0]} ${p[1].charAt(0)}.${p[2].charAt(0)}.`);
  forms.push(`${p[0]} ${p[1]}`);
  if (p[2]) forms.push(`${p[0]} ${p[1]} ${p[2].charAt(0)}.`);
  if (!forms.includes(n)) forms.push(n);
  return forms;
}

function samePerson(a, b) {
  return (
    String(a).trim().toLocaleLowerCase("es") ===
    String(b).trim().toLocaleLowerCase("es")
  );
}

/**
 * Nombre corto único respecto a `peers`.
 * Si hay dos "Pablo Ruiz …", usa inicial del segundo apellido: Pablo R.J. / Pablo R.G.
 */
export function shortPlayerName(fullName, peers = []) {
  const name = String(fullName || "").trim();
  if (!name) return "";

  const others = (peers || [])
    .map((p) => String(p).trim())
    .filter((p) => p && !samePerson(p, name));

  const forms = nameForms(name);
  for (const form of forms) {
    const taken = others.some((other) => nameForms(other).includes(form));
    if (!taken) return form;
  }
  return forms[forms.length - 1];
}
