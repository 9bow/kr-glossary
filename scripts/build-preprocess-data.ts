#!/usr/bin/env tsx

/**
 * 빌드 시점 데이터 전처리 스크립트
 *
 * 용어 데이터의 중복 제거, 검증, 최적화, 정렬을 빌드 시점에 수행합니다.
 * 이를 통해 런타임 성능을 향상시키고 메모리 사용량을 줄입니다.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Term, TermMeaning } from '../src/types/index.js';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ProcessingStats {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  warnings: number;
  errors: number;
  successRate: string;
}

class DataPreprocessor {
  private readonly __dirname = dirname(fileURLToPath(import.meta.url));
  private readonly projectRoot = join(this.__dirname, '..');
  private readonly inputFile = join(this.projectRoot, 'data/terms/terms-a-z.json');
  private readonly outputFile = join(this.projectRoot, 'public/data/terms/terms-a-z.json');

  /**
   * 메인 처리 함수
   */
  async process(): Promise<void> {
    console.log('🚀 빌드 시점 데이터 전처리 시작...');

    try {
      // 입력 파일 존재 확인
      if (!existsSync(this.inputFile)) {
        throw new Error(`입력 파일을 찾을 수 없습니다: ${this.inputFile}`);
      }

      // 원본 데이터 로드
      console.log('📂 원본 데이터 로드 중...');
      const rawData = readFileSync(this.inputFile, 'utf-8');
      let terms: Term[] = JSON.parse(rawData);

      console.log(`📊 원본 데이터: ${terms.length}개 용어`);

      // 1. 중복 제거
      const deduplicationResult = this.removeDuplicates(terms);
      terms = deduplicationResult.terms;

      // 2. 검증 및 최적화
      const validationResult = this.validateAndOptimizeTerms(terms);
      terms = validationResult.terms;

      // 3. 영어 기준 정렬
      terms.sort((a, b) => a.english.localeCompare(b.english));

      // 4. 통계 정보 출력
      this.printStatistics(deduplicationResult.stats, validationResult.stats);

      // 5. 처리된 데이터 저장
      this.saveProcessedData(terms);

      console.log('✅ 빌드 시점 데이터 전처리 완료!');

    } catch (error) {
      console.error('❌ 데이터 전처리 중 오류 발생:', error);
      process.exit(1);
    }
  }

  /**
   * 중복 ID 제거
   */
  private removeDuplicates(terms: Term[]): { terms: Term[]; stats: { duplicates: number } } {
    console.log('🧹 중복 ID 제거 중...');

    const termsMap = new Map<string, Term>();
    let duplicateCount = 0;

    terms.forEach((term, _index) => {
      if (term && term.id) {
        if (termsMap.has(term.id)) {
          duplicateCount++;
          console.warn(`중복 ID 발견: ${term.id} (기존 항목 유지, 중복 항목 무시)`);
        } else {
          termsMap.set(term.id, term);
        }
      }
    });

    const deduplicatedTerms = Array.from(termsMap.values());

    console.log(`✅ 중복 제거 완료: ${terms.length}개 → ${deduplicatedTerms.length}개 (${duplicateCount}개 중복 제거)`);

    return {
      terms: deduplicatedTerms,
      stats: { duplicates: duplicateCount }
    };
  }

  /**
   * 용어 데이터 검증 및 최적화
   */
  private validateAndOptimizeTerms(terms: Term[]): { terms: Term[]; stats: ProcessingStats } {
    console.log('🔍 용어 데이터 검증 및 최적화 중...');

    const stats: ProcessingStats = {
      total: terms.length,
      valid: 0,
      invalid: 0,
      duplicates: 0,
      warnings: 0,
      errors: 0,
      successRate: '0%'
    };

    const validatedTerms: Term[] = [];

    terms.forEach((term, index) => {
      const validation = this.validateTerm(term, index);
      stats.warnings += validation.warnings.length;
      stats.errors += validation.errors.length;

      if (validation.isValid) {
        stats.valid++;
        validatedTerms.push(this.optimizeTerm(term));
      } else {
        stats.invalid++;
        console.error(`❌ 유효하지 않은 용어 (인덱스 ${index}):`, validation.errors);
      }
    });

    stats.successRate = ((stats.valid / stats.total) * 100).toFixed(1) + '%';

    console.log(`✅ 검증 완료: ${stats.valid}개 유효, ${stats.invalid}개 무효`);

    return { terms: validatedTerms, stats };
  }

  /**
   * 개별 용어 검증
   */
  private validateTerm(term: unknown, index: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 기본 필수 필드 검증
    if (!term || typeof term !== 'object') {
      errors.push(`항목 ${index}: 객체가 아님`);
      return { isValid: false, errors, warnings };
    }

    // 필수 필드 검증
    const requiredFields = ['id', 'english', 'korean', 'definition'];
    for (const field of requiredFields) {
      if (!term[field]) {
        errors.push(`항목 ${index}: 필수 필드 '${field}'가 누락됨`);
      }
    }

    if (!term.id || typeof term.id !== 'string' || term.id.trim().length === 0) {
      errors.push(`항목 ${index}: 유효하지 않은 ID`);
    }

    if (!term.english || typeof term.english !== 'string' || term.english.trim().length === 0) {
      errors.push(`항목 ${index}: 유효하지 않은 영어 용어`);
    }

    if (!term.korean || typeof term.korean !== 'string' || term.korean.trim().length === 0) {
      errors.push(`항목 ${index}: 유효하지 않은 한국어 용어`);
    }

    // 정의 검증
    if (!term.definition || typeof term.definition !== 'object') {
      errors.push(`항목 ${index}: 유효하지 않은 정의 객체`);
    } else {
      if (!term.definition.korean || typeof term.definition.korean !== 'string') {
        errors.push(`항목 ${index}: 유효하지 않은 한국어 정의`);
      }
      if (!term.definition.english || typeof term.definition.english !== 'string') {
        errors.push(`항목 ${index}: 유효하지 않은 영어 정의`);
      }
    }

    // 추가 검증들 (간소화된 버전)
    if (term.english && term.english.length > 100) {
      warnings.push(`항목 ${index}: 영어 용어가 너무 김 (100자 제한)`);
    }
    if (term.korean && term.korean.length > 50) {
      warnings.push(`항목 ${index}: 한국어 용어가 너무 김 (50자 제한)`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 용어 데이터 최적화
   */
  private optimizeTerm(term: Term): Term {
    return {
      ...term,
      english: term.english.trim(),
      korean: term.korean.trim(),
      definition: term.definition ? {
        korean: term.definition.korean?.trim() || '',
        english: term.definition.english?.trim() || '',
      } : undefined,
      // 기타 필드들도 필요에 따라 최적화 가능
    };
  }

  /**
   * 통계 정보 출력
   */
  private printStatistics(dedupStats: { duplicates: number }, validationStats: ProcessingStats): void {
    console.log('\n📈 처리 통계:');
    console.log(`   • 총 용어 수: ${validationStats.total}`);
    console.log(`   • 중복 제거: ${dedupStats.duplicates}개`);
    console.log(`   • 유효 용어: ${validationStats.valid}개`);
    console.log(`   • 무효 용어: ${validationStats.invalid}개`);
    console.log(`   • 경고: ${validationStats.warnings}개`);
    console.log(`   • 오류: ${validationStats.errors}개`);
    console.log(`   • 성공률: ${validationStats.successRate}`);
  }

  /**
   * 처리된 데이터 저장
   */
  private saveProcessedData(terms: Term[]): void {
    console.log('💾 처리된 데이터 저장 중...');

    // JSON 데이터 저장
    const jsonData = JSON.stringify(terms, null, 2);
    writeFileSync(this.outputFile, jsonData, 'utf-8');

    console.log(`✅ 처리된 데이터 저장 완료: ${this.outputFile}`);
    console.log(`   파일 크기: ${(jsonData.length / 1024).toFixed(2)} KB`);
  }
}

// 실행
async function main() {
  const preprocessor = new DataPreprocessor();
  await preprocessor.process();
}

main().catch(console.error);
