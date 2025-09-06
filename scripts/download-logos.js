import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 로고 다운로드 함수
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${filepath}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete the file on error
      reject(err);
    });
  });
}

// 조직 이름에서 파일명 생성 함수 (도메인 기반)
function getLogoFilename(org, logoUrl) {
  // 한글 이름을 영문 도메인으로 변환 시도
  const koreanToDomainMap = {
    '제이펍': 'jpub.tistory.com',
    '비제이퍼블릭': 'bjpublic.tistory.com',
    '길벗': 'gilbut.co.kr',
    '루비페이퍼': 'rubypaper.co.kr',
    '인사이트': 'insightbook.co.kr',
    '위키북스': 'wikibook.co.kr',
    '영진닷컴': 'youngjin.com',
    '생능출판사': 'booksr.co.kr',
    '한빛미디어': 'hanbit.co.kr',
    '골든래빗': 'goldenrabbit.co.kr',
    '정보문화사': 'icc.co.kr',
    '에이콘출판': 'acornpub.co.kr',
    '책만': 'bookand.co.kr',
    '파이토치 한국 사용자 모임': 'pytorch.kr'
  };

  // 매핑된 도메인이 있으면 사용
  if (koreanToDomainMap[org.name]) {
    return koreanToDomainMap[org.name] + '.png';
  }

  // 매핑이 없으면 URL에서 도메인 추출
  try {
    const url = new URL(logoUrl || org.homepage);
    let domain = url.hostname.replace(/^www\./, '');
    return domain + '.png';
  } catch (error) {
    // fallback to organization name
    return org.name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, '')
      .replace(/\s+/g, '-') + '.png';
  }
}

// 메인 함수
async function downloadLogos() {
  try {
    // 조직 데이터 읽기
    const orgDataPath = path.join(__dirname, '..', 'data', 'organizations', 'verified-organizations.json');
    const orgData = JSON.parse(fs.readFileSync(orgDataPath, 'utf8'));

    // 로고 디렉토리 생성
    const logosDir = path.join(__dirname, '..', 'public', 'logos');
    if (!fs.existsSync(logosDir)) {
      fs.mkdirSync(logosDir, { recursive: true });
    }

    console.log('Downloading organization logos...');

    // 각 조직의 로고 다운로드
    for (const org of orgData) {
      if (org.logo) {
        const filename = getLogoFilename(org, org.logo);
        const filepath = path.join(logosDir, filename);

        try {
          await downloadImage(org.logo, filepath);
        } catch (error) {
          console.error(`Failed to download logo for ${org.name}:`, error.message);

          // favicon인 경우 .ico 확장자로 시도
          if (org.logo.includes('favicon.ico')) {
            const icoFilename = filename.replace('.png', '.ico');
            const icoFilepath = path.join(logosDir, icoFilename);
            try {
              await downloadImage(org.logo, icoFilepath);
              console.log(`Downloaded favicon as: ${icoFilepath}`);
            } catch (icoError) {
              console.error(`Failed to download favicon for ${org.name}:`, icoError.message);
            }
          }
        }
      }
    }

    console.log('Logo download completed!');
  } catch (error) {
    console.error('Error downloading logos:', error);
    process.exit(1);
  }
}

// 스크립트 실행
downloadLogos();
