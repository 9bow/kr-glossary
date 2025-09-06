#!/usr/bin/env python3
"""
동적 사이트맵 생성 스크립트
용어 데이터를 기반으로 모든 용어 페이지를 포함한 사이트맵 생성
"""

import json
import urllib.parse
from datetime import datetime
from pathlib import Path


def generate_sitemap():
    """동적 사이트맵 생성"""
    
    # 기본 URL 설정
    base_url = "https://glossary.kr"
    current_date = datetime.now().strftime("%Y-%m-%d")
    
    sitemap_content = []
    sitemap_content.append('<?xml version="1.0" encoding="UTF-8"?>')
    sitemap_content.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    
    # 기본 페이지들 추가
    pages = [
        {"url": "/", "priority": "1.0", "changefreq": "weekly"},
        {"url": "/search", "priority": "0.9", "changefreq": "daily"},
        {"url": "/about", "priority": "0.7", "changefreq": "monthly"},
        {"url": "/contribute", "priority": "0.7", "changefreq": "monthly"},
        {"url": "/workflow", "priority": "0.6", "changefreq": "monthly"},
        {"url": "/contributors", "priority": "0.6", "changefreq": "weekly"},
        {"url": "/organizations", "priority": "0.6", "changefreq": "weekly"},
    ]
    
    for page in pages:
        sitemap_content.append(f'  <url>')
        sitemap_content.append(f'    <loc>{base_url}{page["url"]}</loc>')
        sitemap_content.append(f'    <lastmod>{current_date}</lastmod>')
        sitemap_content.append(f'    <changefreq>{page["changefreq"]}</changefreq>')
        sitemap_content.append(f'    <priority>{page["priority"]}</priority>')
        sitemap_content.append(f'  </url>')
    
    # 용어별 페이지 추가
    terms_file = Path('data/terms/terms-a-z.json')
    if terms_file.exists():
        try:
            with open(terms_file, 'r', encoding='utf-8') as f:
                terms = json.load(f)
            
            for term in terms:
                # 용어 ID를 URL로 변환
                term_id = term.get('id', '')
                if term_id:
                    # URL 인코딩
                    term_url = f"/term/{urllib.parse.quote(term_id)}"
                    
                    sitemap_content.append(f'  <url>')
                    sitemap_content.append(f'    <loc>{base_url}{term_url}</loc>')
                    sitemap_content.append(f'    <lastmod>{current_date}</lastmod>')
                    sitemap_content.append(f'    <changefreq>monthly</changefreq>')
                    sitemap_content.append(f'    <priority>0.8</priority>')
                    sitemap_content.append(f'  </url>')
                    
        except Exception as e:
            print(f"용어 파일 읽기 오류: {e}")
    
    # 카테고리별 페이지 추가
    categories = ['ML', 'DL', 'NLP', 'CV', 'RL', 'GAI']
    for category in categories:
        category_url = f"/category/{category.lower()}"
        sitemap_content.append(f'  <url>')
        sitemap_content.append(f'    <loc>{base_url}{category_url}</loc>')
        sitemap_content.append(f'    <lastmod>{current_date}</lastmod>')
        sitemap_content.append(f'    <changefreq>weekly</changefreq>')
        sitemap_content.append(f'    <priority>0.7</priority>')
        sitemap_content.append(f'  </url>')
    
    # 알파벳별 인덱스 페이지 추가
    for letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
        index_url = f"/index/{letter.lower()}"
        sitemap_content.append(f'  <url>')
        sitemap_content.append(f'    <loc>{base_url}{index_url}</loc>')
        sitemap_content.append(f'    <lastmod>{current_date}</lastmod>')
        sitemap_content.append(f'    <changefreq>weekly</changefreq>')
        sitemap_content.append(f'    <priority>0.5</priority>')
        sitemap_content.append(f'  </url>')
    
    sitemap_content.append('</urlset>')
    
    # 사이트맵 출력
    sitemap_xml = '\n'.join(sitemap_content)
    print(sitemap_xml)
    
    return sitemap_xml


if __name__ == '__main__':
    generate_sitemap()