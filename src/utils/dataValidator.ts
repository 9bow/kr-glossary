import type {
  Term,
  TermInput,
  ValidationError,
  ValidationStatus,
  ReferenceType,
  ContributionType
} from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 용어 데이터의 유효성을 검증합니다.
 */
export function validateTerm(
  term: Partial<Term | TermInput>,
  options: {
    checkDuplicates?: boolean;
    existingTerms?: Term[];
    strict?: boolean;
  } = {}
): ValidationResult {
  const { checkDuplicates = false, existingTerms = [] } = options;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate required fields
  if (!term.english?.trim()) {
    errors.push('영어 용어(english)는 필수입니다.');
  }

  if (!term.korean?.trim()) {
    errors.push('한국어 용어(korean)는 필수입니다.');
  }

  if (!term.definition?.korean?.trim() || !term.definition?.english?.trim()) {
    errors.push('정의(definition)는 한국어와 영어 모두 필수입니다.');
  }



  // Validate field types and formats
  if (term.english && typeof term.english !== 'string') {
    errors.push('영어 용어는 문자열이어야 합니다.');
  }

  if (term.korean && typeof term.korean !== 'string') {
    errors.push('한국어 용어는 문자열이어야 합니다.');
  }

  // Validate length limits
  if (term.english && term.english.length > 200) {
    errors.push('영어 용어는 200자를 초과할 수 없습니다.');
  }

  if (term.korean && term.korean.length > 200) {
    errors.push('한국어 용어는 200자를 초과할 수 없습니다.');
  }

  if (term.definition?.korean && term.definition.korean.length > 1000) {
    errors.push('한국어 정의는 1000자를 초과할 수 없습니다.');
  }

  if (term.definition?.english && term.definition.english.length > 1000) {
    errors.push('영어 정의는 1000자를 초과할 수 없습니다.');
  }



  // Validate status validity
  if (term.status) {
    const validStatuses: ValidationStatus[] = ['draft', 'proposed', 'validated'];
    if (!validStatuses.includes(term.status)) {
      errors.push(`유효하지 않은 상태입니다. 허용되는 값: ${validStatuses.join(', ')}`);
    }
  }

  // Validate alternative translations
  if (term.alternatives && !Array.isArray(term.alternatives)) {
    errors.push('대안 번역(alternatives)은 배열이어야 합니다.');
  }

  if (term.alternatives && term.alternatives.length > 5) {
    errors.push('대안 번역은 최대 5개까지 허용됩니다.');
  }

  // Validate examples
  if (term.examples && !Array.isArray(term.examples)) {
    errors.push('예시(examples)는 배열이어야 합니다.');
  }

  if (term.examples && term.examples.length > 5) {
    errors.push('예시는 최대 5개까지 허용됩니다.');
  }

  if (term.examples) {
    term.examples.forEach((example, index) => {
      if (!example.korean?.trim() || !example.english?.trim()) {
        errors.push(`예시 ${index + 1}: 한국어와 영어 텍스트 모두 필수입니다.`);
      }
    });
  }

  // Validate references
  if (term.references && !Array.isArray(term.references)) {
    errors.push('참고문헌(references)은 배열이어야 합니다.');
  }

  if (term.references && term.references.length > 10) {
    errors.push('참고문헌은 최대 10개까지 허용됩니다.');
  }

  if (term.references) {
    term.references.forEach((reference, index) => {
      if (!reference.title?.trim()) {
        errors.push(`참고문헌 ${index + 1}: 제목은 필수입니다.`);
      }
      if (!reference.type) {
        errors.push(`참고문헌 ${index + 1}: 타입은 필수입니다.`);
      }

      const validTypes: ReferenceType[] = ['paper', 'book', 'documentation', 'website'];
      if (reference.type && !validTypes.includes(reference.type)) {
        errors.push(`참고문헌 ${index + 1}: 유효하지 않은 타입입니다.`);
      }

      if (reference.url && !isValidUrl(reference.url)) {
        errors.push(`참고문헌 ${index + 1}: 유효하지 않은 URL입니다.`);
      }

      if (reference.year && (reference.year < 1900 || reference.year > new Date().getFullYear() + 1)) {
        errors.push(`참고문헌 ${index + 1}: 유효하지 않은 연도입니다.`);
      }
    });
  }

  // Validate contributors
  if (term.contributors) {
    term.contributors.forEach((contributor, index) => {
      if (!contributor.githubUsername?.trim()) {
        errors.push(`기여자 ${index + 1}: GitHub username은 필수입니다.`);
      }
      if (!contributor.contributionType) {
        errors.push(`기여자 ${index + 1}: 기여 타입은 필수입니다.`);
      }

      const validTypes: ContributionType[] = ['author', 'editor', 'reviewer'];
      if (contributor.contributionType && !validTypes.includes(contributor.contributionType)) {
        errors.push(`기여자 ${index + 1}: 유효하지 않은 기여 타입입니다.`);
      }
    });
  }

  // Check for duplicates
  if (checkDuplicates && term.english) {
    const duplicate = existingTerms.find(
      existing => existing.english.toLowerCase() === term.english!.toLowerCase()
    );
    if (duplicate) {
      errors.push(`중복된 용어가 존재합니다: ${duplicate.english}`);
    }
  }

  // Warning messages
  if (term.definition?.korean && term.definition.korean.length < 10) {
    warnings.push('한국어 정의가 너무 짧습니다. 더 자세한 설명을 권장합니다.');
  }

  if (term.definition?.english && term.definition.english.length < 10) {
    warnings.push('영어 정의가 너무 짧습니다. 더 자세한 설명을 권장합니다.');
  }

  if (!term.examples || term.examples.length === 0) {
    warnings.push('사용 예시를 추가하는 것을 권장합니다.');
  }

  if (!term.references || term.references.length === 0) {
    warnings.push('참고문헌을 추가하는 것을 권장합니다.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * URL 유효성을 검증합니다.
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 용어 데이터를 정규화합니다.
 */
export function normalizeTerm(term: Partial<Term>): Partial<Term> {
  return {
    ...term,
    english: term.english?.trim(),
    korean: term.korean?.trim(),
    alternatives: term.alternatives?.map(alt => alt.trim()).filter(Boolean),
    definition: term.definition ? {
      korean: term.definition.korean?.trim(),
      english: term.definition.english?.trim(),
    } : undefined,
    examples: term.examples?.map(example => ({
      korean: example.korean?.trim(),
      english: example.english?.trim(),
      source: example.source?.trim(),
    })),
    references: term.references?.map(ref => ({
      ...ref,
      title: ref.title?.trim(),
      url: ref.url?.trim(),
    })),
  };
}

/**
 * 유효성 검사 결과를 ValidationError 형식으로 변환합니다.
 */
export function validationResultToError(
  result: ValidationResult,
  field?: string
): ValidationError {
  return {
    code: 'VALIDATION_ERROR',
    message: '데이터 유효성 검증에 실패했습니다.',
    errors: result.errors.map((error, index) => ({
      field: field || `field_${index}`,
      message: error,
      code: 'VALIDATION_FAILED',
    })),
  };
}
