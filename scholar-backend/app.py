from flask import Flask, jsonify, Response
from flask_cors import CORS
from scholarly import scholarly
import time
import requests
import urllib.parse
from crossref.restful import Works
import re
from html import unescape
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

AUTHOR_ID = "uC-4EagAAAAJ"
CACHE_FILE = "scholar_cache.json"
CACHE_DURATION = 24 * 3600  # 24 hours

# Load cache when server starts
print("Starting server...")
if os.path.exists(CACHE_FILE):
    print(f"Found cache file: {CACHE_FILE}")
else:
    print("No cache file found. Will create one on first request.")

def clean_abstract(abstract):
    if not abstract:
        return None
        
    # Remove HTML/XML tags
    cleaned = re.sub(r'<[^>]+>', '', abstract)
    # Convert HTML entities
    cleaned = unescape(cleaned)
    # Remove multiple spaces
    cleaned = re.sub(r'\s+', ' ', cleaned)
    # Remove special characters
    cleaned = re.sub(r'[^\w\s.,;?!-]', '', cleaned)
    return cleaned.strip()

def fetch_semantic_scholar_abstract(title, authors):
    try:
        # First try to find the paper ID using the search API
        encoded_title = urllib.parse.quote(title)
        search_url = f"https://api.semanticscholar.org/graph/v1/paper/search?query={encoded_title}&fields=paperId,title,authors"
        response = requests.get(search_url)
        data = response.json()
        
        if data.get('data'):
            # Try to find the exact paper by matching title and authors
            for paper in data['data']:
                if paper.get('paperId'):
                    # Get detailed paper info using the paper ID
                    paper_url = f"https://api.semanticscholar.org/graph/v1/paper/{paper['paperId']}?fields=title,abstract,venue,year,authors"
                    paper_response = requests.get(paper_url)
                    paper_data = paper_response.json()
                    
                    abstract = paper_data.get('abstract')
                    if abstract:
                        cleaned_abstract = clean_abstract(abstract)
                        print(f"\nFound paper in Semantic Scholar:")
                        print(f"Title: {paper_data.get('title')}")
                        print(f"Abstract length: {len(cleaned_abstract)}")
                        return cleaned_abstract
    except Exception as e:
        print(f"Error fetching from Semantic Scholar: {e}")
    return None

def fetch_crossref_abstract(title, authors):
    try:
        works = Works()
        # Search by title
        results = works.query(title).filter(has_abstract='true')
        
        for work in results:
            abstract = work.get('abstract')
            if abstract:
                cleaned_abstract = clean_abstract(abstract)
                print(f"\nFound paper in Crossref:")
                print(f"Title: {work.get('title')[0]}")
                print(f"Abstract length: {len(cleaned_abstract)}")
                return cleaned_abstract
    except Exception as e:
        print(f"Error fetching from Crossref: {e}")
    return None

def fetch_pubmed_abstract(title):
    try:
        # First search for the paper by title
        search_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term={urllib.parse.quote(title)}&retmode=json"
        search_response = requests.get(search_url)
        search_data = search_response.json()
        
        # Get the PubMed ID
        if 'esearchresult' in search_data and search_data['esearchresult'].get('idlist'):
            pubmed_id = search_data['esearchresult']['idlist'][0]
            
            # Fetch the abstract using the PubMed ID
            fetch_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id={pubmed_id}&retmode=xml"
            fetch_response = requests.get(fetch_url)
            
            # Extract abstract from XML response
            if '<Abstract>' in fetch_response.text:
                abstract_start = fetch_response.text.find('<Abstract>') + len('<Abstract>')
                abstract_end = fetch_response.text.find('</Abstract>')
                abstract = fetch_response.text[abstract_start:abstract_end].strip()
                
                # Clean up XML tags
                if '<AbstractText>' in abstract:
                    abstract = abstract.replace('<AbstractText>', '').replace('</AbstractText>', '')
                
                print(f"\nFound paper in PubMed:")
                print(f"Title: {title}")
                print(f"Abstract length: {len(abstract)}")
                return abstract
    except Exception as e:
        print(f"Error fetching from PubMed: {e}")
    return None

def fetch_scholar_data():
    try:
        author = scholarly.search_author_id(AUTHOR_ID)
        scholarly.fill(author)
        
        publications = []
        for pub in author['publications']:
            try:
                scholarly.fill(pub)
                print(f"\nProcessing: {pub['bib'].get('title')}")
                
                # Try multiple sources for abstract
                abstract = None
                
                # 1. Try Google Scholar
                abstract = clean_abstract(pub['bib'].get('abstract'))
                print(f"Google Scholar abstract available: {bool(abstract)}")
                
                # 2. Try Crossref if no abstract or abstract is truncated
                if not abstract or len(abstract) < 1000:
                    crossref_abstract = fetch_crossref_abstract(
                        pub['bib'].get('title'),
                        pub['bib'].get('author', [])
                    )
                    if crossref_abstract:
                        abstract = crossref_abstract
                        print(f"Using Crossref abstract")
                
                # 3. Try Semantic Scholar as last resort
                if not abstract:
                    abstract = fetch_semantic_scholar_abstract(
                        pub['bib'].get('title'),
                        pub['bib'].get('author', [])
                    )
                    print(f"Semantic Scholar abstract available: {bool(abstract)}")
                
                if abstract:
                    print(f"Final abstract length: {len(abstract)}")
                    print(f"Abstract preview: {abstract[:200]}...")
                
                publications.append({
                    'title': pub['bib'].get('title'),
                    'authors': pub['bib'].get('author'),
                    'venue': pub['bib'].get('journal', pub['bib'].get('venue')),
                    'year': int(pub['bib'].get('pub_year', 0)),
                    'citations': pub.get('num_citations', 0),
                    'url': pub.get('pub_url'),
                    'abstract': abstract
                })
            except Exception as e:
                print(f"Error processing publication: {e}")
                continue
        
        publications.sort(key=lambda x: x['citations'], reverse=True)
        
        return {
            'author': {
                'name': author['name'],
                'citations': author['citedby'],
                'hIndex': author['hindex'],
                'i10Index': author['i10index']
            },
            'publications': publications
        }
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None

def load_cached_data():
    try:
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                cache_age = time.time() - data.get('timestamp', 0)
                print(f"Cache age: {cache_age/3600:.1f} hours")
                return data.get('data'), cache_age < CACHE_DURATION
    except Exception as e:
        print(f"Error loading cache: {e}")
    return None, False

def save_to_cache(data):
    try:
        cache_data = {
            'timestamp': time.time(),
            'last_updated': datetime.now().isoformat(),
            'data': data
        }
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)
        print("Cache updated successfully")
    except Exception as e:
        print(f"Error saving cache: {e}")

@app.route('/api/publications')
def get_publications():
    cached_data, is_fresh = load_cached_data()
    if cached_data and is_fresh:
        return jsonify({
            'data': cached_data,
            'fromCache': True,
            'isFresh': True,
            'lastUpdated': datetime.fromtimestamp(time.time() - (time.time() % CACHE_DURATION)).isoformat()
        })
    
    # If no cache or stale cache, redirect to streaming endpoint
    return Response(
        "Please use /api/publications/stream for initial data fetch",
        status=307,  # Temporary redirect
        headers={"Location": "/api/publications/stream"}
    )

@app.route('/api/publications/update', methods=['POST'])
def force_update():
    print("Force updating publications...")
    try:
        data = fetch_scholar_data()
        if data:
            save_to_cache(data)
            return jsonify({
                'success': True,
                'message': 'Data updated successfully',
                'lastUpdated': datetime.now().isoformat(),
                'data': data
            })
        return jsonify({
            'success': False,
            'message': 'Failed to fetch new data'
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/publications/status')
def get_cache_status():
    try:
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
                return jsonify({
                    'has_cache': True,
                    'last_updated': cache_data.get('last_updated'),
                    'is_fresh': time.time() - cache_data.get('timestamp', 0) < CACHE_DURATION
                })
        return jsonify({
            'has_cache': False,
            'last_updated': None,
            'is_fresh': False
        })
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/api/publications/stream')
def stream_publications():
    def generate():
        try:
            print("Starting to fetch publications...")
            author = scholarly.search_author_id(AUTHOR_ID)
            scholarly.fill(author)
            
            total_pubs = len(author['publications'])
            publications = []
            
            # Send initial progress - Fix the backslash issue
            yield f"data: {json.dumps({'progress': {'current': 0, 'total': total_pubs, 'latest': 'Starting...'}})}\\n\\n".replace('\\n', '\n')
            
            for i, pub in enumerate(author['publications'], 1):
                try:
                    scholarly.fill(pub)
                    title = pub['bib'].get('title', '')
                    print(f"\nProcessing: {title} ({i}/{total_pubs})")
                    
                    # Send progress update
                    yield f"data: {json.dumps({'progress': {'current': i, 'total': total_pubs, 'latest': title}})}\n\n"
                    
                    # Try multiple sources for abstract
                    abstract = None
                    
                    # 1. Try Google Scholar
                    abstract = clean_abstract(pub['bib'].get('abstract'))
                    print(f"Google Scholar abstract available: {bool(abstract)}")
                    
                    # 2. Try Crossref if no abstract or abstract is truncated
                    if not abstract or len(abstract) < 1000:  # Try Crossref if abstract seems truncated
                        crossref_abstract = fetch_crossref_abstract(
                            pub['bib'].get('title'),
                            pub['bib'].get('author', [])
                        )
                        if crossref_abstract:
                            abstract = crossref_abstract
                            print(f"Using Crossref abstract")
                    
                    # 3. Try Semantic Scholar as last resort
                    if not abstract:
                        abstract = fetch_semantic_scholar_abstract(
                            pub['bib'].get('title'),
                            pub['bib'].get('author', [])
                        )
                        print(f"Semantic Scholar abstract available: {bool(abstract)}")
                    
                    if abstract:
                        print(f"Final abstract length: {len(abstract)}")
                        print(f"Abstract preview: {abstract[:200]}...")
                    
                    publications.append({
                        'title': pub['bib'].get('title'),
                        'authors': pub['bib'].get('author'),
                        'venue': pub['bib'].get('journal', pub['bib'].get('venue')),
                        'year': int(pub['bib'].get('pub_year', 0)),
                        'citations': pub.get('num_citations', 0),
                        'url': pub.get('pub_url'),
                        'abstract': abstract
                    })
                    
                except Exception as e:
                    print(f"Error processing publication: {e}")
                    continue
            
            # Save and send final data
            final_data = {
                'author': {
                    'name': author['name'],
                    'citations': author['citedby'],
                    'hIndex': author['hindex'],
                    'i10Index': author['i10index']
                },
                'publications': publications
            }
            save_to_cache(final_data)
            
            yield f"data: {json.dumps({'done': True, 'data': final_data})}\n\n"
            
        except Exception as e:
            print(f"Error fetching data: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return Response(generate(), mimetype='text/event-stream')

@app.route('/api/status')
def get_server_status():
    return jsonify({
        'status': 'ready',
        'cache_exists': os.path.exists(CACHE_FILE)
    })

if __name__ == '__main__':
    app.run(port=3001) 