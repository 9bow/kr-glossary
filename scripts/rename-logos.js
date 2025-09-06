import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// URL에서 도메인 추출 함수 (전체 도메인 사용)
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    let domain = urlObj.hostname;

    // www. 제거
    domain = domain.replace(/^www\./, '');

    return domain;
  } catch (error) {
    console.error(`Invalid URL: ${url}`);
    return null;
  }
}

// 메인 함수
async function renameLogos() {
  try {
    // 조직 데이터 읽기
    const orgDataPath = path.join(__dirname, '..', 'data', 'organizations', 'verified-organizations.json');
    const orgData = JSON.parse(fs.readFileSync(orgDataPath, 'utf8'));

    const logosDir = path.join(__dirname, '..', 'public', 'logos');

    console.log('Renaming logo files to full domain names...');

    // 기존 파일명을 새 파일명으로 매핑
    const fileMappings = {
      'hanbit.png': 'hanbit.co.kr.png',
      'gilbut.png': 'gilbut.co.kr.png',
      'insightbook.png': 'insightbook.co.kr.png',
      'bjpublic.png': 'bjpublic.tistory.com.png',
      'rubypaper.png': 'rubypaper.co.kr.png',
      'jpub.png': 'jpub.tistory.com.png',
      'wikibook.png': 'wikibook.co.kr.png',
      'youngjin.png': 'youngjin.com.png',
      'booksr.png': 'booksr.co.kr.png',
      'goldenrabbit.png': 'goldenrabbit.co.kr.png',
      'pytorch.png': 'pytorch.kr.png',
      '에이콘출판.png': 'acornpub.co.kr.png',
      '책만.png': 'bookand.co.kr.png',
      '정보문화사.png': 'icc.co.kr.png',
      'bjpublic.tistory.com.ico': 'bjpublic.tistory.com.ico',
      'jpub.tistory.com.ico': 'jpub.tistory.com.ico',
    };

    // 각 매핑에 대해 파일명 변경
    for (const [oldName, newName] of Object.entries(fileMappings)) {
      const oldPath = path.join(logosDir, oldName);
      const newPath = path.join(logosDir, newName);

      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        console.log(`Renamed: ${oldName} -> ${newName}`);
      } else {
        console.log(`File not found: ${oldName}`);
      }
    }

    console.log('Logo renaming completed!');
  } catch (error) {
    console.error('Error renaming logos:', error);
    process.exit(1);
  }
}

// 스크립트 실행
renameLogos();
