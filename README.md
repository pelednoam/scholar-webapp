# Scholar Profile Webpage

A dynamic web application that automatically fetches and displays academic publications from Google Scholar. The application features real-time progress tracking, smart caching, and comprehensive publication management.

## Overview

This application provides an automated way to showcase academic publications and metrics from Google Scholar. It includes features like real-time updates, smart caching, and detailed publication information with abstracts from multiple sources.

## Key Features

### Data Retrieval
- Automatic fetching from Google Scholar
- Real-time progress tracking during updates
- Smart caching system with configurable duration
- Multiple abstract sources (Google Scholar, Crossref, Semantic Scholar)

### Publication Management
- Most cited papers section
- Complete publications list with pagination
- Advanced search and filtering
- Automatic research categorization
- Interactive abstract viewer
- Citation links to Google Scholar

## Technical Stack

### Frontend
- React.js
- Material-UI (MUI)
- Server-Sent Events for real-time updates

### Backend
- Flask (Python)
- scholarly (Google Scholar API)
- Multiple abstract sources integration

## Setup

1. Install frontend dependencies:
```bash
cd scholar-webpage
npm install
```

2. Install backend dependencies:
```bash
cd scholar-backend
pip install -r requirements.txt
```

3. Configure Google Scholar ID:
- Open `scholar-backend/app.py`
- Update `AUTHOR_ID` with your Google Scholar ID

4. Start the backend server:
```bash
python app.py
```

5. Start the frontend:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Configuration

### Cache Settings
In `scholar-backend/app.py`:
```python
CACHE_DURATION = 24 * 3600  # Cache duration in seconds
CACHE_FILE = "scholar_cache.json"  # Cache file location
```

### API Endpoints

- `GET /api/publications`: Retrieve publications (uses cache if available)
- `GET /api/publications/stream`: Stream publications with progress updates
- `POST /api/publications/update`: Force update publications
- `GET /api/publications/status`: Get cache status
- `GET /api/status`: Check server status


