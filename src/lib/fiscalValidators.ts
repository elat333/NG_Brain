/**
 * Fiscal and Identification Validators for Ecuador (SRI / Registro Civil)
 * Inspired by Tryton ERP's python-stdnum validation logic for Party Identifiers.
 */

export interface FiscalValidationResult {
  isValid: boolean;
  type: 'cedula' | 'ruc_natural' | 'ruc_privada' | 'ruc_publica' | 'extranjero' | 'invalido';
  message: string;
}

/**
 * Validates an Ecuadorian 10-digit Cédula using the Modulo 10 checksum algorithm.
 */
export const validateCedulaEcuador = (cedula: string): boolean => {
  const clean = (cedula || '').trim().replace(/\D/g, '');
  if (clean.length !== 10) return false;

  const province = parseInt(clean.substring(0, 2), 10);
  if ((province < 1 || province > 24) && province !== 30) {
    return false;
  }

  const thirdDigit = parseInt(clean.charAt(2), 10);
  if (thirdDigit >= 6) {
    return false; // Cédula must have 3rd digit between 0 and 5
  }

  const digits = clean.split('').map(Number);
  const verifier = digits[9];
  const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let product = digits[i] * coefficients[i];
    if (product >= 10) product -= 9;
    sum += product;
  }

  const remainder = sum % 10;
  const calculatedVerifier = remainder === 0 ? 0 : 10 - remainder;

  return calculatedVerifier === verifier;
};

/**
 * Validates an Ecuadorian 13-digit RUC for:
 * 1. Persona Natural (10-digit cédula + 001..)
 * 2. Sociedad Privada / Extranjeros (3rd digit 9, mod 11, verifier at pos 10, suffix 001..)
 * 3. Sociedad Pública (3rd digit 6, mod 11, verifier at pos 9, suffix 0001..)
 */
export const validateRucEcuador = (ruc: string): FiscalValidationResult => {
  const clean = (ruc || '').trim().replace(/\D/g, '');

  if (clean.length !== 13) {
    return {
      isValid: false,
      type: 'invalido',
      message: 'El RUC debe tener exactamente 13 dígitos numéricos.'
    };
  }

  const province = parseInt(clean.substring(0, 2), 10);
  if ((province < 1 || province > 24) && province !== 30) {
    return {
      isValid: false,
      type: 'invalido',
      message: 'Código de provincia inválido (dos primeros dígitos).'
    };
  }

  const thirdDigit = parseInt(clean.charAt(2), 10);
  const digits = clean.split('').map(Number);

  // 1. Persona Natural: 3rd digit 0..5
  if (thirdDigit < 6) {
    const cedulaPart = clean.substring(0, 10);
    const establishment = clean.substring(10, 13);

    if (establishment === '000') {
      return {
        isValid: false,
        type: 'invalido',
        message: 'El código de establecimiento no puede ser 000.'
      };
    }

    if (!validateCedulaEcuador(cedulaPart)) {
      return {
        isValid: false,
        type: 'invalido',
        message: 'La base de la cédula del RUC no es válida (dígito verificador incorrecto).'
      };
    }

    return {
      isValid: true,
      type: 'ruc_natural',
      message: 'RUC de Persona Natural válido.'
    };
  }

  // 2. Sociedad Pública: 3rd digit = 6 (Dígito verificador en posición 9)
  if (thirdDigit === 6) {
    const establishment = clean.substring(9, 13);
    if (establishment === '0000') {
      return {
        isValid: false,
        type: 'invalido',
        message: 'El código de establecimiento público no puede ser 0000.'
      };
    }

    const coefficients = [3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += digits[i] * coefficients[i];
    }

    const remainder = sum % 11;
    const calculatedVerifier = remainder === 0 ? 0 : 11 - remainder;
    const verifier = digits[8];

    if (calculatedVerifier === verifier) {
      return {
        isValid: true,
        type: 'ruc_publica',
        message: 'RUC de Institución Pública válido.'
      };
    } else {
      return {
        isValid: false,
        type: 'invalido',
        message: 'Dígito verificador de RUC público no coincide.'
      };
    }
  }

  // 3. Sociedad Privada / Jurídica / Extranjeros: 3rd digit = 9 (Dígito verificador en posición 10)
  if (thirdDigit === 9) {
    const establishment = clean.substring(10, 13);
    if (establishment === '000') {
      return {
        isValid: false,
        type: 'invalido',
        message: 'El código de establecimiento privado no puede ser 000.'
      };
    }

    const coefficients = [4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += digits[i] * coefficients[i];
    }

    const remainder = sum % 11;
    const calculatedVerifier = remainder === 0 ? 0 : 11 - remainder;
    const verifier = digits[9];

    if (calculatedVerifier === verifier) {
      return {
        isValid: true,
        type: 'ruc_privada',
        message: 'RUC de Sociedad Privada / Jurídica válido.'
      };
    } else {
      return {
        isValid: false,
        type: 'invalido',
        message: 'Dígito verificador de RUC privado no coincide.'
      };
    }
  }

  return {
    isValid: false,
    type: 'invalido',
    message: 'Estructura de RUC no reconocida.'
  };
};

/**
 * Universal identification validation for Ecuadorian ID (Cédula / RUC / Pasaporte).
 */
export const validateIdentification = (idStr: string): FiscalValidationResult => {
  const clean = (idStr || '').trim().replace(/\D/g, '');

  if (!clean) {
    return {
      isValid: false,
      type: 'invalido',
      message: 'Campo de identificación vacío.'
    };
  }

  // If 10 digits -> Check Cédula
  if (clean.length === 10) {
    const validCedula = validateCedulaEcuador(clean);
    return {
      isValid: validCedula,
      type: validCedula ? 'cedula' : 'invalido',
      message: validCedula
        ? 'Cédula de Identidad ecuatoriana válida.'
        : 'Cédula de Identidad no válida (código de provincia o dígito verificador erróneo).'
    };
  }

  // If 13 digits -> Check RUC
  if (clean.length === 13) {
    return validateRucEcuador(clean);
  }

  // If alphanumeric / passport or international format
  if (idStr.trim().length >= 5) {
    return {
      isValid: true,
      type: 'extranjero',
      message: 'Documento / Pasaporte internacional registrado.'
    };
  }

  return {
    isValid: false,
    type: 'invalido',
    message: 'Longitud de documento inválida (Debe tener 10 dígitos para Cédula o 13 para RUC).'
  };
};

/**
 * Check for duplicates in memory across Members and Companies.
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  type?: 'cedula' | 'ruc' | 'email';
  foundEntityName?: string;
  foundEntityId?: string;
  foundIn?: 'Persona' | 'Empresa';
}

export const checkIdentificationDuplicate = (
  idToCheck: string,
  allMembers: Array<{ id: string; name: string; identificationId?: string; ruc?: string; email?: string }>,
  allCompanies: Array<{ id: string; name: string; ruc?: string; email?: string }>,
  currentEditingId?: string
): DuplicateCheckResult => {
  const clean = (idToCheck || '').trim().toLowerCase().replace(/[\s.-]/g, '');
  if (!clean || clean.length < 5) {
    return { isDuplicate: false };
  }

  // Check Members
  for (const m of allMembers) {
    if (currentEditingId && m.id === currentEditingId) continue;

    const mCedula = (m.identificationId || '').trim().toLowerCase().replace(/[\s.-]/g, '');
    const mRuc = (m.ruc || '').trim().toLowerCase().replace(/[\s.-]/g, '');

    if (mCedula === clean || mRuc === clean) {
      return {
        isDuplicate: true,
        type: mCedula === clean ? 'cedula' : 'ruc',
        foundEntityName: m.name,
        foundEntityId: m.id,
        foundIn: 'Persona'
      };
    }
  }

  // Check Companies
  for (const c of allCompanies) {
    if (currentEditingId && c.id === currentEditingId) continue;

    const cRuc = (c.ruc || '').trim().toLowerCase().replace(/[\s.-]/g, '');
    if (cRuc === clean) {
      return {
        isDuplicate: true,
        type: 'ruc',
        foundEntityName: c.name,
        foundEntityId: c.id,
        foundIn: 'Empresa'
      };
    }
  }

  return { isDuplicate: false };
};
