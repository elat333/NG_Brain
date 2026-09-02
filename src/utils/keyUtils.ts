/**
 * Generador universal de claves únicas para React (.map)
 * Garantiza que nunca existan colisiones de claves, incluso si la base de datos
 * contiene IDs duplicados, nulos, cadenas vacías o valores repetidos.
 */
export function makeKey(prefix: string, item: any, index: number): string {
  if (item === null || item === undefined) {
    return `${prefix}_null_${index}`;
  }
  if (typeof item === 'object') {
    const rawId = item.id ?? item.code ?? item.val ?? item.value ?? item.memberId ?? item.companyId ?? item.name ?? index;
    const cleanId = String(rawId).trim() || `idx_${index}`;
    return `${prefix}_${cleanId}_${index}`;
  }
  const cleanPrimitive = String(item).trim() || `idx_${index}`;
  return `${prefix}_${cleanPrimitive}_${index}`;
}
